import { X509Certificate } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import tls from "node:tls";
import forge from "node-forge";
import { getRepositoryCrossSigns } from "./ca-repository";
import type { Locale } from "./i18n";
import type { CertificateDto, ChainStep, TLSChainResponse } from "./types";
import { publicLookupFor, publicLookupForUrl } from "./validation";

const tlsTimeoutMs = Number(process.env.TLS_TIMEOUT_MS ?? 8000);
const aiaTimeoutMs = Number(process.env.AIA_TIMEOUT_MS ?? 5000);
const maxAiaBytes = Number(process.env.AIA_MAX_BYTES ?? 1_000_000);
const maxDepth = Number(process.env.CHAIN_MAX_DEPTH ?? 8);
const crtshSearchTimeoutMs = Number(process.env.CRTSH_SEARCH_TIMEOUT_MS ?? 15000);
const crtshCertTimeoutMs = Number(process.env.CRTSH_CERT_TIMEOUT_MS ?? 5000);
const maxCrtshCandidates = Number(process.env.CRTSH_MAX_CANDIDATES ?? 5);
const enableCrtshRuntimeLookup = process.env.ENABLE_CRTSH_RUNTIME_LOOKUP === "1";
const userAgent = process.env.TLS_SCAN_USER_AGENT ?? "SSLConf/0.1 (+https://sslconf.com)";

function normalizePem(pem: string) {
  return pem.endsWith("\n") ? pem : `${pem}\n`;
}

function splitPemBundle(pemBundle: string) {
  return pemBundle.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [];
}

function loadTrustRoots() {
  const roots = tls.rootCertificates.map((pem: string) => new X509Certificate(pem));
  const systemBundlePaths = [
    "/etc/ssl/certs/ca-certificates.crt",
    "/etc/pki/tls/certs/ca-bundle.crt",
    "/etc/ssl/ca-bundle.pem"
  ];

  for (const path of systemBundlePaths) {
    if (!existsSync(path)) continue;
    try {
      roots.push(...splitPemBundle(readFileSync(path, "utf8")).map((pem) => new X509Certificate(pem)));
    } catch {
      // The bundled Node trust store is still usable if a system CA bundle cannot be parsed.
    }
  }

  return Array.from(new Map(roots.map((cert) => [cert.fingerprint256, cert])).values());
}

function toCertificateDto(cert: X509Certificate, index: number, role: CertificateDto["role"], source: CertificateDto["source"]): CertificateDto {
  return {
    index,
    role,
    subject: cert.subject,
    issuer: cert.issuer,
    serialNumber: cert.serialNumber,
    validFrom: cert.validFrom,
    validTo: cert.validTo,
    fingerprint256: cert.fingerprint256,
    subjectAltName: cert.subjectAltName,
    ca: cert.ca,
    source,
    pem: normalizePem(cert.toString())
  };
}

function sameCert(a: X509Certificate, b: X509Certificate) {
  return a.fingerprint256 === b.fingerprint256;
}

function publicKeyDer(cert: X509Certificate) {
  return cert.publicKey.export({ type: "spki", format: "der" }).toString("base64");
}

function sameSubjectAndKey(a: X509Certificate, b: X509Certificate) {
  return a.subject === b.subject && publicKeyDer(a) === publicKeyDer(b);
}

function isTimeValid(cert: X509Certificate, at = new Date()) {
  return new Date(cert.validFrom) <= at && at <= new Date(cert.validTo);
}

function aiaIssuerUrls(cert: X509Certificate) {
  return (cert.infoAccess ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("CA Issuers - URI:"))
    .map((line) => line.replace("CA Issuers - URI:", "").trim())
    .filter((url) => url.startsWith("http://") || url.startsWith("https://"));
}

type Pkcs7MessageWithCertificates = {
  certificates?: forge.pki.Certificate[];
};

function parseDownloadedCertificates(buffer: Buffer): X509Certificate[] {
  const text = buffer.toString("utf8");
  if (text.includes("-----BEGIN CERTIFICATE-----")) return [new X509Certificate(text)];

  try {
    return [new X509Certificate(buffer)];
  } catch (certificateError) {
    try {
      const der = buffer.toString("binary");
      const asn1 = forge.asn1.fromDer(der);
      const message = forge.pkcs7.messageFromAsn1(asn1) as Pkcs7MessageWithCertificates;
      return (message.certificates ?? []).map((cert: forge.pki.Certificate) => new X509Certificate(forge.pki.certificateToPem(cert)));
    } catch {
      throw certificateError;
    }
  }
}

async function fetchAiaCertificates(url: string, redirects = 0): Promise<X509Certificate[]> {
  if (redirects > 3) throw new Error("Demasiadas redirecciones descargando AIA.");

  const response = await requestAiaBuffer(url);
  if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
      const location = response.headers.location;
      if (!location) throw new Error("Redirección AIA sin Location.");
      return fetchAiaCertificates(new URL(location, url).toString(), redirects + 1);
  }
  if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`No se pudo descargar AIA (${response.statusCode ?? "sin estado"}).`);
  }
  return parseDownloadedCertificates(response.buffer);
}

function requestForProtocol(protocol: string) {
  return protocol === "http:" ? httpRequest : httpsRequest;
}

async function requestAiaBuffer(url: string) {
  const { parsed, lookup } = await publicLookupForUrl(url, { context: "AIA URL", allowedPorts: [80, 443] });

  return new Promise<{ statusCode?: number; headers: { location?: string }; buffer: Buffer }>((resolve, reject) => {
    const req = requestForProtocol(parsed.protocol)({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: `${parsed.pathname}${parsed.search}`,
      method: "GET",
      timeout: aiaTimeoutMs,
      lookup,
      headers: {
        "user-agent": userAgent
      }
    }, (res) => {
      const contentLength = Number(res.headers["content-length"] ?? 0);
      if (contentLength > maxAiaBytes) {
        res.resume();
        reject(new Error("Certificado AIA demasiado grande."));
        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;
      res.on("data", (chunk: Buffer) => {
        total += chunk.byteLength;
        if (total > maxAiaBytes) {
          req.destroy(new Error("Certificado AIA demasiado grande."));
          return;
        }
        chunks.push(chunk);
      });
      res.once("end", () => {
        const location = Array.isArray(res.headers.location) ? res.headers.location[0] : res.headers.location;
        resolve({ statusCode: res.statusCode, headers: { location }, buffer: Buffer.concat(chunks) });
      });
    });

    req.once("timeout", () => req.destroy(new Error("Timeout descargando AIA.")));
    req.once("error", reject);
    req.end();
  });
}

export async function getServerCertificates(host: string, port: number) {
  const lookup = await publicLookupFor(host);

  return new Promise<X509Certificate[]>((resolve, reject) => {
    const socket = tls.connect({
      host,
      port,
      servername: isIP(host) ? undefined : host,
      rejectUnauthorized: false,
      timeout: tlsTimeoutMs,
      lookup
    });

    socket.once("secureConnect", () => {
      const detailed = socket.getPeerCertificate(true);
      const certs: X509Certificate[] = [];
      const seen = new Set<string>();
      let current: tls.DetailedPeerCertificate | undefined = detailed;

      while (current?.raw && !seen.has(current.fingerprint256)) {
        seen.add(current.fingerprint256);
        certs.push(new X509Certificate(current.raw));
        if (!current.issuerCertificate || current.issuerCertificate === current) break;
        current = current.issuerCertificate;
      }

      socket.end();
      if (certs.length === 0) reject(new Error("El servidor no entregó certificado."));
      else resolve(certs);
    });

    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("Timeout conectando por TLS."));
    });
    socket.once("error", reject);
  });
}

export async function verifyServerTrust(host: string, port: number) {
  const lookup = await publicLookupFor(host);

  return new Promise<{ verified: boolean; error?: string }>((resolve) => {
    const socket = tls.connect({
      host,
      port,
      servername: isIP(host) ? undefined : host,
      rejectUnauthorized: true,
      timeout: tlsTimeoutMs,
      lookup
    });

    socket.once("secureConnect", () => {
      const verified = socket.authorized;
      const authorizationError = socket.authorizationError;
      const error = authorizationError instanceof Error ? authorizationError.message : authorizationError;
      socket.end();
      resolve({ verified, error });
    });

    socket.once("timeout", () => socket.destroy(new Error("Timeout validando la cadena TLS.")));
    socket.once("error", (error) => resolve({ verified: false, error: error.message }));
  });
}

function findIssuer(cert: X509Certificate, candidates: X509Certificate[]) {
  return candidates.find((candidate) => isTimeValid(candidate) && cert.checkIssued(candidate) && cert.verify(candidate.publicKey));
}

function isSelfSignedRoot(cert: X509Certificate) {
  return cert.ca && cert.subject === cert.issuer && cert.verify(cert.publicKey);
}

function validCrossSignedEquivalent(root: X509Certificate, current: X509Certificate, candidate: X509Certificate) {
  return (
    !isSelfSignedRoot(candidate) &&
    isTimeValid(candidate) &&
    sameSubjectAndKey(candidate, root) &&
    current.checkIssued(candidate) &&
    current.verify(candidate.publicKey)
  );
}

function findValidCrossSignedEquivalent(root: X509Certificate, current: X509Certificate, candidates: X509Certificate[]) {
  return candidates.find((candidate) => validCrossSignedEquivalent(root, current, candidate));
}

function findKnownCrossSignedEquivalent(root: X509Certificate, current: X509Certificate) {
  return getRepositoryCrossSigns().find((candidate) => validCrossSignedEquivalent(root, current, candidate) && trustAnchorFor(candidate));
}

function subjectCommonName(cert: X509Certificate) {
  return cert.subject
    .split("\n")
    .find((part) => part.startsWith("CN="))
    ?.slice(3);
}

function trustAnchorFor(cert: X509Certificate) {
  return findIssuer(cert, trustRoots);
}

function selectAiaIssuer(current: X509Certificate, candidates: X509Certificate[]) {
  return candidates
    .filter((cert) => isTimeValid(cert) && current.checkIssued(cert) && current.verify(cert.publicKey))
    .sort((a, b) => {
      const score = (cert: X509Certificate) => (isSelfSignedRoot(cert) ? 0 : 100) + (trustAnchorFor(cert) ? 50 : 0);
      return score(b) - score(a);
    })[0] ?? null;
}

function crossSignScore(candidate: X509Certificate) {
  const issuer = candidate.issuer.toLowerCase();
  let score = 0;
  if (issuer.includes("entrust root certification authority - g2")) score += 100;
  if (!issuer.includes("ssl corporation")) score += 20;
  score -= Math.max(0, Math.floor((new Date(candidate.validTo).getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000)));
  return score;
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type CrtshEntry = {
  id?: number;
  issuer_name?: string;
  name_value?: string;
  not_before?: string;
  not_after?: string;
};

function crtshEntryScore(entry: CrtshEntry) {
  const issuer = (entry.issuer_name ?? "").toLowerCase();
  let score = 0;
  if (issuer.includes("entrust root certification authority - g2")) score += 100;
  if (!issuer.includes("ssl corporation")) score += 20;
  const notAfter = entry.not_after ? new Date(entry.not_after).getTime() : Number.MAX_SAFE_INTEGER;
  score -= Math.max(0, Math.floor((notAfter - Date.now()) / (365 * 24 * 60 * 60 * 1000)));
  return score;
}

type ChainText = ReturnType<typeof chainText>;

async function findCrtshCrossSignedEquivalent(root: X509Certificate, current: X509Certificate, steps: ChainStep[], text: ChainText) {
  const cn = subjectCommonName(root);
  if (!cn) return null;
  const cacheKey = `${root.fingerprint256}:${current.fingerprint256}`;
  if (crtshCrossSignCache.has(cacheKey)) return crtshCrossSignCache.get(cacheKey) ?? null;

  try {
    const searchUrl = `https://crt.sh/?q=${encodeURIComponent(cn)}&output=json`;
    const searchResponse = await fetchWithTimeout(searchUrl, crtshSearchTimeoutMs);
    if (!searchResponse.ok) {
      steps.push({ level: "warning", message: text.crtshBadStatus(searchResponse.status) });
      crtshCrossSignCache.set(cacheKey, null);
      return null;
    }

    const entries = await searchResponse.json() as CrtshEntry[];
    const now = Date.now();
    const ids = Array.from(new Set(entries
      .filter((entry) =>
        entry.id &&
        entry.name_value === cn &&
        entry.not_before &&
        entry.not_after &&
        new Date(entry.not_before).getTime() <= now &&
        now <= new Date(entry.not_after).getTime()
      )
      .sort((a, b) => crtshEntryScore(b) - crtshEntryScore(a))
      .map((entry) => entry.id as number)))
      .slice(0, maxCrtshCandidates);
    const candidates = (await Promise.all(ids.map(async (id) => {
      try {
        const certResponse = await fetchWithTimeout(`https://crt.sh/?d=${id}`, crtshCertTimeoutMs);
        if (!certResponse.ok) return null;
        const cert = parseDownloadedCertificates(Buffer.from(await certResponse.arrayBuffer()))[0];
        if (!cert) return null;
        if (validCrossSignedEquivalent(root, current, cert) && trustAnchorFor(cert)) return cert;
      } catch {
        // crt.sh es una fuente auxiliar; si un candidato falla, seguimos con el resto.
      }
      return null;
    }))).filter((candidate): candidate is X509Certificate => Boolean(candidate));

    candidates.sort((a, b) => crossSignScore(b) - crossSignScore(a));
    const selected = candidates[0] ?? null;
    crtshCrossSignCache.set(cacheKey, selected);
    return selected;
  } catch (error) {
    steps.push({ level: "warning", message: error instanceof Error ? text.crtshFailed(error.message) : text.crtshFailedGeneric });
    crtshCrossSignCache.set(cacheKey, null);
    return null;
  }
}

const trustRoots = loadTrustRoots();
const crtshCrossSignCache = new Map<string, X509Certificate | null>();

function chainText(locale: Locale) {
  return {
    leafReceived: (host: string, port: number) => locale === "es" ? `Certificado leaf recibido desde ${host}:${port}.` : `Leaf certificate received from ${host}:${port}.`,
    hostnameMismatch: locale === "es" ? "El certificado no cubre el hostname consultado." : "The certificate does not cover the requested hostname.",
    aiaIssuer: (url: string) => locale === "es" ? `Issuer descargado desde AIA: ${url}.` : `Issuer downloaded from AIA: ${url}.`,
    aiaNoSigner: (url: string) => locale === "es" ? `Ningún certificado AIA firma el certificado actual: ${url}.` : `No AIA certificate signs the current certificate: ${url}.`,
    knownCross: (subject: string) => locale === "es" ? `Cross-sign del repositorio local seleccionado para compatibilidad: ${subject}.` : `Local repository cross-sign selected for compatibility: ${subject}.`,
    crtshCross: (subject: string) => locale === "es" ? `Cross-sign alternativo encontrado en crt.sh: ${subject}.` : `Alternative cross-sign found in crt.sh: ${subject}.`,
    serverCross: (subject: string) => locale === "es" ? `Cross-sign válido encontrado en la cadena servida: ${subject}.` : `Valid cross-sign found in the served chain: ${subject}.`,
    trustedRoot: (subject: string) => locale === "es" ? `Cadena validada contra raíz confiable: ${subject}.` : `Chain validated against trusted root: ${subject}.`,
    serverFallback: (subject: string) => locale === "es" ? `AIA no aportó un issuer válido; se usa un intermedio servido que valida criptográficamente: ${subject}.` : `AIA did not provide a valid issuer; using a served intermediate that validates cryptographically: ${subject}.`,
    noAia: (subject: string) => locale === "es" ? `No hay CA Issuers en AIA para ${subject}.` : `There are no CA Issuers AIA entries for ${subject}.`,
    summaryOk: locale === "es" ? "CA bundle generado con los certificados necesarios para completar la cadena TLS." : "CA bundle generated with the certificates needed to complete the TLS chain.",
    summaryFailed: locale === "es" ? "No se pudo completar la cadena hasta una raíz confiable." : "The chain could not be completed to a trusted root.",
    crtshBadStatus: (status: number) => locale === "es" ? `crt.sh no respondió correctamente (${status}).` : `crt.sh did not respond successfully (${status}).`,
    crtshFailed: (message: string) => locale === "es" ? `No se pudo consultar crt.sh: ${message}.` : `Could not query crt.sh: ${message}.`,
    crtshFailedGeneric: locale === "es" ? "No se pudo consultar crt.sh." : "Could not query crt.sh."
  };
}

export async function inspectTlsChain(host: string, port: number, includeRoot: boolean, locale: Locale = "en"): Promise<TLSChainResponse> {
  const queryId = crypto.randomUUID();
  const steps: ChainStep[] = [];
  const text = chainText(locale);
  const aiaUrls: string[] = [];
  const serverCerts = await getServerCertificates(host, port);
  const leaf = serverCerts[0];
  const hostnameValid = isIP(host) ? true : leaf.checkHost(host) !== undefined;
  const chain: Array<{ cert: X509Certificate; source: CertificateDto["source"] }> = [{ cert: leaf, source: "server" }];
  const intermediates = serverCerts.slice(1);

  steps.push({ level: "ok", message: text.leafReceived(host, port) });
  if (!hostnameValid) steps.push({ level: "warning", message: text.hostnameMismatch });

  let current = leaf;
  let verified = false;

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const urls = aiaIssuerUrls(current);
    const aiaWarnings: ChainStep[] = [];
    aiaUrls.push(...urls);

    let downloaded: X509Certificate | null = null;
    for (const url of urls) {
      try {
        const candidates = await fetchAiaCertificates(url);
        const candidate = selectAiaIssuer(current, candidates);
        if (!candidate) {
          aiaWarnings.push({ level: "warning", message: text.aiaNoSigner(url) });
          continue;
        }
        downloaded = candidate;
        steps.push({ level: "ok", message: text.aiaIssuer(url) });
        break;
      } catch (error) {
        aiaWarnings.push({ level: "warning", message: error instanceof Error ? error.message : `Falló la descarga AIA: ${url}.` });
      }
    }

    if (downloaded) {
      const knownCrossSigned = isSelfSignedRoot(downloaded) ? findKnownCrossSignedEquivalent(downloaded, current) : null;
      const crtshCrossSigned = isSelfSignedRoot(downloaded) && !knownCrossSigned && enableCrtshRuntimeLookup ? await findCrtshCrossSignedEquivalent(downloaded, current, steps, text) : null;
      const serverCrossSigned = isSelfSignedRoot(downloaded) ? findValidCrossSignedEquivalent(downloaded, current, intermediates) : null;
      const crossSigned = knownCrossSigned ?? crtshCrossSigned ?? serverCrossSigned;
      const issuer = crossSigned ?? downloaded;
      const source: CertificateDto["source"] = knownCrossSigned ? "repository" : crtshCrossSigned ? "crtsh" : serverCrossSigned ? "server" : "aia";
      if (knownCrossSigned) {
        steps.push({ level: "ok", message: text.knownCross(knownCrossSigned.subject) });
      } else if (crtshCrossSigned) {
        steps.push({ level: "ok", message: text.crtshCross(crtshCrossSigned.subject) });
      } else if (serverCrossSigned) {
        steps.push({ level: "ok", message: text.serverCross(serverCrossSigned.subject) });
      }
      if (!chain.some((item) => sameCert(item.cert, issuer))) chain.push({ cert: issuer, source });
      current = issuer;
      continue;
    }

    const trustedRoot = findIssuer(current, trustRoots);
    if (trustedRoot) {
      verified = true;
      if (includeRoot && !chain.some((item) => sameCert(item.cert, trustedRoot))) {
        chain.push({ cert: trustedRoot, source: "trust-store" });
      }
      steps.push({ level: "ok", message: text.trustedRoot(trustedRoot.subject) });
      break;
    }

    steps.push(...aiaWarnings);

    const serverIssuer = findIssuer(current, intermediates);
    if (serverIssuer && !chain.some((item) => sameCert(item.cert, serverIssuer))) {
      chain.push({ cert: serverIssuer, source: "server" });
      steps.push({ level: "warning", message: text.serverFallback(serverIssuer.subject) });
      current = serverIssuer;
      continue;
    }

    if (urls.length === 0) {
      steps.push({ level: "error", message: text.noAia(current.subject) });
    }
    break;
  }

  const status = verified ? "OK" : chain.length > 1 ? "PARTIAL" : "FAILED";
  const bundleChain = chain
    .slice(1)
    .filter((item) => includeRoot || !isSelfSignedRoot(item.cert));
  const certDtos = bundleChain.map((item, index) => {
    const role = isSelfSignedRoot(item.cert) ? "root" : "intermediate";
    return toCertificateDto(item.cert, index, role, item.source);
  });
  const pemBundle = certDtos.map((cert) => cert.pem).join("");

  return {
    queryId,
    host,
    port,
    status,
    verified,
    hostnameValid,
    summary: verified ? text.summaryOk : text.summaryFailed,
    aiaUrls: Array.from(new Set(aiaUrls)),
    certificates: certDtos,
    pemBundle,
    steps
  };
}
