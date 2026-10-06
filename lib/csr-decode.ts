import forge from "node-forge";
import type { Locale } from "./i18n";
import type { DecodedCsrResponse } from "./types";

const signatureAlgorithms: Record<string, string> = {
  "1.2.840.113549.1.1.5": "sha1WithRSAEncryption",
  "1.2.840.113549.1.1.11": "sha256WithRSAEncryption",
  "1.2.840.113549.1.1.12": "sha384WithRSAEncryption",
  "1.2.840.113549.1.1.13": "sha512WithRSAEncryption"
};

type CsrExtension = Record<string, unknown> & { name?: string; altNames?: Array<Record<string, unknown>> };

function normalizedInput(input: string): { pem: string } | { der: string } {
  const trimmed = input.trim();
  const pem = trimmed.match(/-----BEGIN CERTIFICATE REQUEST-----[\s\S]*?-----END CERTIFICATE REQUEST-----/);
  if (pem) return { pem: pem[0] };

  if (/^[a-zA-Z0-9+/=\s]+$/.test(trimmed)) {
    return { der: trimmed.replace(/\s/g, "") };
  }

  throw new Error("Invalid CSR.");
}

function subjectText(csr: forge.pki.CertificateSigningRequest) {
  return csr.subject.attributes
    .map((attribute) => `${attribute.shortName ?? attribute.name ?? attribute.type}=${String(attribute.value)}`)
    .join("\n");
}

function sanValue(altName: Record<string, unknown>) {
  const value = String(altName.value ?? "");
  if (altName.type === 2) return `DNS:${value}`;
  if (altName.type === 6) return `URI:${value}`;
  if (altName.type === 1) return `email:${value}`;
  if (altName.type === 7) return `IP:${value}`;
  return value;
}

function requestedExtensions(csr: forge.pki.CertificateSigningRequest) {
  const attribute = csr.getAttribute({ name: "extensionRequest" });
  return (attribute?.extensions ?? []) as CsrExtension[];
}

function keyDetails(csr: forge.pki.CertificateSigningRequest) {
  const key = csr.publicKey as (forge.pki.PublicKey & { n?: { bitLength: () => number } }) | null;
  if (key && "n" in key && key.n) return { type: "rsa", bits: key.n.bitLength() };
  return { type: undefined, bits: undefined };
}

export function decodeCsr(input: string, locale: Locale): DecodedCsrResponse {
  let csr: forge.pki.CertificateSigningRequest;
  try {
    const normalized = normalizedInput(input);
    csr = "pem" in normalized
      ? forge.pki.certificationRequestFromPem(normalized.pem)
      : forge.pki.certificationRequestFromAsn1(forge.asn1.fromDer(forge.util.decode64(normalized.der)));
  } catch {
    throw new Error("Invalid CSR.");
  }

  const extensions = requestedExtensions(csr);
  const sanExtension = extensions.find((extension) => extension.name === "subjectAltName");
  const sans = (sanExtension?.altNames ?? []).map(sanValue).filter(Boolean);
  const key = keyDetails(csr);
  const signatureAlgorithm = csr.signatureOid ? signatureAlgorithms[csr.signatureOid] ?? csr.signatureOid : undefined;
  const signatureValid = csr.verify();
  const findings: DecodedCsrResponse["findings"] = [];
  const isSpanish = locale === "es";

  findings.push(signatureValid
    ? { level: "pass", title: isSpanish ? "Firma CSR válida" : "Valid CSR signature", detail: isSpanish ? "La firma de la solicitud PKCS#10 se valida frente a la clave pública incluida en la CSR." : "The PKCS#10 request signature verifies against the public key embedded in the CSR." }
    : { level: "fail", title: isSpanish ? "Firma CSR no válida" : "Invalid CSR signature", detail: isSpanish ? "La firma de la solicitud no se valida. Genera una nueva CSR antes de enviarla a una autoridad certificadora." : "The request signature does not verify. Generate a new CSR before submitting it to a certificate authority." });

  if (sans.length) {
    findings.push({ level: "pass", title: isSpanish ? "Nombres alternativos solicitados" : "Subject alternative names requested", detail: isSpanish ? `Se incluyen ${sans.length} valores SAN en extensionRequest.` : `${sans.length} SAN value${sans.length === 1 ? " is" : "s are"} included in extensionRequest.` });
  } else {
    findings.push({ level: "warning", title: isSpanish ? "No hay nombres alternativos" : "No subject alternative names", detail: isSpanish ? "Los certificados TLS modernos deben solicitar todos los hostnames en SAN, incluido el common name cuando se use." : "Modern TLS certificates should request all hostnames in SAN, including the common name when it is used." });
  }

  if (key.type === "rsa" && key.bits && key.bits < 2048) {
    findings.push({ level: "fail", title: isSpanish ? "La clave RSA es demasiado pequeña" : "RSA key is too small", detail: isSpanish ? `La CSR usa RSA ${key.bits}. Utiliza al menos RSA 2048 antes de solicitar un certificado TLS público.` : `The CSR uses RSA ${key.bits}. Use at least RSA 2048 before requesting a public TLS certificate.` });
  } else if (key.type === "rsa") {
    findings.push({ level: "pass", title: isSpanish ? "Tamaño de clave RSA aceptable" : "RSA key size is acceptable", detail: isSpanish ? `La CSR usa RSA de ${key.bits} bits.` : `The CSR uses RSA ${key.bits} bits.` });
  } else {
    findings.push({ level: "info", title: isSpanish ? "Tipo de clave pública" : "Public key type", detail: isSpanish ? "La solicitud se ha interpretado, pero este decodificador no puede determinar el tamaño de clave para este algoritmo." : "The request was parsed, but this decoder cannot determine the public key size for this algorithm." });
  }

  if (signatureAlgorithm?.toLowerCase().includes("sha1")) {
    findings.push({ level: "warning", title: isSpanish ? "Firma SHA-1 heredada" : "Legacy SHA-1 signature", detail: isSpanish ? "Genera la CSR con SHA-256 o superior antes de enviarla." : "Generate the CSR with SHA-256 or stronger before submitting it." });
  }

  return {
    subject: subjectText(csr),
    signatureAlgorithm,
    signatureValid,
    key,
    subjectAltNames: sans,
    requestedExtensions: extensions.map((extension) => extension.name ?? "unknown"),
    findings
  };
}
