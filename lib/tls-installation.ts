import { isIP } from "node:net";
import tls from "node:tls";
import { X509Certificate } from "node:crypto";
import type { Locale } from "./i18n";
import { getServerCertificates, verifyServerTrust } from "./tls";
import type { TlsInstallationCheck, TlsInstallationEndpoint, TlsInstallationResponse } from "./types";
import { assertPublicHostname, resolvePublicHostname } from "./validation";

const endpointTimeoutMs = Number(process.env.TLS_INSTALLATION_ENDPOINT_TIMEOUT_MS ?? 5000);
const maxEndpoints = Number(process.env.TLS_INSTALLATION_ENDPOINT_MAX ?? 8);
const endpointConcurrency = Number(process.env.TLS_INSTALLATION_ENDPOINT_CONCURRENCY ?? 4);

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
}

function certificateKeyBits(cert: X509Certificate) {
  const details = cert.publicKey.asymmetricKeyDetails;
  return details && "modulusLength" in details ? details.modulusLength : undefined;
}

function isSelfSignedRoot(cert: X509Certificate) {
  try {
    return cert.ca && cert.subject === cert.issuer && cert.verify(cert.publicKey);
  } catch {
    return false;
  }
}

function copy(locale: Locale) {
  const es = locale === "es";
  return {
    trusted: es ? ["Cadena servida confiable", "La instalación presentada por el servidor valida correctamente contra una raíz de confianza."] : ["Trusted served chain", "The installation presented by the server validates correctly to a trusted root."],
    untrusted: es ? ["Cadena servida no confiable", "La cadena que entrega el servidor no valida correctamente. Instala el certificado y los intermedios correctos."] : ["Untrusted served chain", "The chain delivered by the server does not validate correctly. Install the correct certificate and intermediates."],
    hostname: es ? ["Hostname cubierto", "El certificado presentado cubre el hostname consultado."] : ["Hostname covered", "The presented certificate covers the requested hostname."],
    hostnameMismatch: es ? ["Hostname no cubierto", "El certificado no incluye el hostname consultado en CN o Subject Alternative Name."] : ["Hostname mismatch", "The certificate does not include the requested hostname in CN or Subject Alternative Name."],
    valid: es ? ["Certificado vigente", "El certificado está dentro de su periodo de validez."] : ["Certificate currently valid", "The certificate is within its validity period."],
    expired: es ? ["Certificado caducado o aún no válido", "Las fechas de validez del certificado impiden una instalación válida."] : ["Expired or not-yet-valid certificate", "The certificate validity dates prevent a valid installation."],
    expiring: (days: number) => es ? ["Certificado próximo a caducar", `Caduca en ${days} días; planifica la renovación.`] : ["Certificate expires soon", `It expires in ${days} days; plan renewal.`],
    serverChain: (count: number) => es ? ["Cadena enviada por el servidor", `El servidor presenta ${count} certificado${count === 1 ? "" : "s"}, incluido el certificado del sitio.`] : ["Server-supplied chain", `The server presents ${count} certificate${count === 1 ? "" : "s"}, including the site certificate.`],
    rootIncluded: es ? ["Certificado raíz enviado", "El servidor parece enviar una raíz autofirmada. Los clientes ya disponen de ella; retírala del fullchain o bundle servido."] : ["Root certificate supplied", "The server appears to send a self-signed root. Clients already have it; remove it from the served fullchain or bundle."],
    endpointsConsistent: es ? ["Endpoints públicos coherentes", "Todas las IP públicas comprobadas presentan el mismo certificado y cubren el hostname."] : ["Consistent public endpoints", "All checked public IPs present the same certificate and cover the hostname."],
    endpointsDifferent: es ? ["Endpoints públicos diferentes", "Alguna IP pública presenta otro certificado o no cubre el hostname. Revisa balanceadores, CDN y nodos de backend."] : ["Public endpoints differ", "One or more public IPs present another certificate or do not cover the hostname. Review load balancers, CDN and backend nodes."],
    endpointsPartial: es ? ["Endpoints públicos sin confirmar", "No se pudo completar la comprobación en alguna IP pública. Confírmala desde la red afectada."] : ["Public endpoints not fully confirmed", "The check could not complete on one or more public IPs. Confirm them from the affected network."],
    validSummary: es ? "La instalación TLS supera las comprobaciones principales." : "The TLS installation passes the primary checks.",
    attentionSummary: es ? "La instalación TLS funciona, pero requiere revisión de advertencias." : "The TLS installation works, but warnings need review.",
    invalidSummary: es ? "La instalación TLS tiene fallos que pueden provocar errores de navegador o clientes." : "The TLS installation has failures that can cause browser or client errors."
  };
}

type PublicAddress = { address: string; family: 4 | 6 };

function fixedLookup(address: PublicAddress) {
  return function lookup(_hostname: string, options: unknown, callback?: (error: NodeJS.ErrnoException | null, address: string | Array<{ address: string; family: number }>, family?: number) => void) {
    const done = typeof options === "function" ? options as typeof callback : callback;
    const all = typeof options === "object" && options !== null && "all" in options && Boolean((options as { all?: boolean }).all);
    if (all) done?.(null, [{ address: address.address, family: address.family }]);
    else done?.(null, address.address, address.family);
  };
}

async function inspectEndpoint(host: string, port: number, address: PublicAddress): Promise<TlsInstallationEndpoint> {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host,
      port,
      servername: isIP(host) ? undefined : host,
      rejectUnauthorized: false,
      timeout: endpointTimeoutMs,
      lookup: fixedLookup(address)
    });
    let settled = false;
    const finish = (result: TlsInstallationEndpoint) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    socket.once("secureConnect", () => {
      try {
        const peer = socket.getPeerCertificate(true);
        if (!peer?.raw) throw new Error("No certificate presented");
        const certificate = new X509Certificate(peer.raw);
        const identityError = isIP(host) ? undefined : tls.checkServerIdentity(host, peer);
        socket.end();
        finish({ address: address.address, family: address.family, status: "complete", fingerprint256: certificate.fingerprint256, hostnameValid: !identityError, validTo: certificate.validTo });
      } catch (error) {
        socket.destroy();
        finish({ address: address.address, family: address.family, status: "error", error: error instanceof Error ? error.message : "Certificate inspection failed" });
      }
    });
    socket.once("timeout", () => {
      socket.destroy();
      finish({ address: address.address, family: address.family, status: "error", error: "TLS connection timed out" });
    });
    socket.once("error", (error) => finish({ address: address.address, family: address.family, status: "error", error: error.message }));
  });
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>) {
  const results: R[] = [];
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await mapper(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export async function validateTlsInstallation(host: string, port: number, locale: Locale = "en"): Promise<TlsInstallationResponse> {
  await assertPublicHostname(host, "installation target");
  const [addresses, certificates, trust] = await Promise.all([
    resolvePublicHostname(host, "installation target"),
    getServerCertificates(host, port),
    verifyServerTrust(host, port)
  ]);
  const leaf = certificates[0];
  if (!leaf) throw new Error("The server did not present a certificate.");

  const selectedAddresses = addresses.slice(0, maxEndpoints) as PublicAddress[];
  const endpoints = await mapWithConcurrency(selectedAddresses, endpointConcurrency, (address) => inspectEndpoint(host, port, address));
  const completedEndpoints = endpoints.filter((endpoint) => endpoint.status === "complete");
  const hasEndpointErrors = endpoints.some((endpoint) => endpoint.status === "error");
  const consistent = completedEndpoints.length === selectedAddresses.length && completedEndpoints.every((endpoint) => endpoint.fingerprint256 === leaf.fingerprint256 && endpoint.hostnameValid);
  const hostnameValid = isIP(host) ? true : leaf.checkHost(host) !== undefined;
  const remainingDays = daysUntil(leaf.validTo);
  const now = Date.now();
  const validNow = new Date(leaf.validFrom).getTime() <= now && now <= new Date(leaf.validTo).getTime();
  const rootCertificateProvided = certificates.slice(1).some(isSelfSignedRoot);
  const text = copy(locale);
  const checks: TlsInstallationCheck[] = [];

  checks.push(makeCheck("hostname", hostnameValid ? "pass" : "fail", hostnameValid ? text.hostname : text.hostnameMismatch));
  checks.push(makeCheck("validity", !validNow ? "fail" : remainingDays <= 30 ? "warning" : "pass", !validNow ? text.expired : remainingDays <= 30 ? text.expiring(Math.max(0, remainingDays)) : text.valid));
  checks.push(makeCheck("trust", trust.verified ? "pass" : "fail", trust.verified ? text.trusted : text.untrusted));
  checks.push(makeCheck("server-chain", "pass", text.serverChain(certificates.length)));
  if (rootCertificateProvided) checks.push(makeCheck("root", "warning", text.rootIncluded));
  const endpointsFullyCovered = addresses.length <= selectedAddresses.length;
  const endpointStatus = !endpointsFullyCovered || hasEndpointErrors
    ? "warning"
    : consistent ? "pass"
      : "fail";
  checks.push(makeCheck("endpoints", endpointStatus, endpointStatus === "pass" ? text.endpointsConsistent : endpointStatus === "warning" ? text.endpointsPartial : text.endpointsDifferent));

  const hasFailures = checks.some((check) => check.status === "fail");
  const hasWarnings = checks.some((check) => check.status === "warning");
  const status = hasFailures ? "invalid" : hasWarnings ? "needs-attention" : "valid";

  return {
    queryId: crypto.randomUUID(),
    host,
    port,
    status,
    summary: status === "valid" ? text.validSummary : status === "needs-attention" ? text.attentionSummary : text.invalidSummary,
    assessedAt: new Date().toISOString(),
    ipAddresses: addresses.map((address) => address.address),
    certificate: {
      subject: leaf.subject,
      issuer: leaf.issuer,
      validFrom: leaf.validFrom,
      validTo: leaf.validTo,
      fingerprint256: leaf.fingerprint256,
      subjectAltName: leaf.subjectAltName,
      keyType: leaf.publicKey.asymmetricKeyType,
      keyBits: certificateKeyBits(leaf)
    },
    hostnameValid,
    trusted: trust.verified,
    trustError: trust.error,
    certificatesProvided: certificates.length,
    rootCertificateProvided,
    daysRemaining: remainingDays,
    endpointCoverage: {
      totalAddresses: addresses.length,
      scannedAddresses: endpoints.length,
      truncated: addresses.length > selectedAddresses.length,
      consistent,
      hasErrors: hasEndpointErrors,
      endpoints
    },
    checks
  };
}

function makeCheck(id: TlsInstallationCheck["id"], status: TlsInstallationCheck["status"], content: string[]) {
  return { id, status, title: content[0], detail: content[1] };
}
