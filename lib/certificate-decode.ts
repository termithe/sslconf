import { X509Certificate } from "node:crypto";
import forge from "node-forge";
import type { DecodedCertificateResponse } from "./types";

const signatureAlgorithms: Record<string, string> = {
  "1.2.840.113549.1.1.5": "sha1WithRSAEncryption",
  "1.2.840.113549.1.1.11": "sha256WithRSAEncryption",
  "1.2.840.113549.1.1.12": "sha384WithRSAEncryption",
  "1.2.840.113549.1.1.13": "sha512WithRSAEncryption",
  "1.2.840.10045.4.3.2": "ecdsa-with-SHA256",
  "1.2.840.10045.4.3.3": "ecdsa-with-SHA384",
  "1.2.840.10045.4.3.4": "ecdsa-with-SHA512",
  "1.3.101.112": "Ed25519"
};

type ForgeExtension = Record<string, unknown> & {
  name?: string;
  cA?: boolean;
};

function normalizedInput(input: string) {
  const trimmed = input.trim();
  const pem = trimmed.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/);
  if (pem) return pem[0];

  if (/^[a-zA-Z0-9+/=\s]+$/.test(trimmed)) {
    return Buffer.from(trimmed.replace(/\s/g, ""), "base64");
  }

  throw new Error("Invalid certificate.");
}

function keyDetails(cert: X509Certificate) {
  const details = cert.publicKey.asymmetricKeyDetails;
  const type = cert.publicKey.asymmetricKeyType;
  const bits = details && "modulusLength" in details ? details.modulusLength : undefined;
  const curve = details && "namedCurve" in details ? details.namedCurve : undefined;
  return { type, bits, curve };
}

function splitLines(value?: string) {
  return value?.split("\n").map((line) => line.trim()).filter(Boolean) ?? [];
}

function subjectAltNames(value?: string) {
  return value?.split(/,\s*/).map((item) => item.trim()).filter(Boolean) ?? [];
}

function extensionValue(extension: ForgeExtension | undefined, name: string) {
  if (!extension) return [];
  const value = extension;
  if (name === "keyUsage") return Object.entries(value).filter(([key, enabled]) => key !== "name" && key !== "id" && key !== "critical" && enabled === true).map(([key]) => key);
  if (name === "extKeyUsage") return Object.entries(value).filter(([key, enabled]) => key !== "name" && key !== "id" && key !== "critical" && enabled === true).map(([key]) => key);
  return [];
}

function extensionUrls(extension: ForgeExtension | undefined) {
  if (!extension || typeof extension.value !== "string") return [];
  return extension.value.match(/https?:\/\/[^\s\u0000]+/g) ?? [];
}

export function decodeCertificate(input: string): DecodedCertificateResponse {
  let cert: X509Certificate;
  try {
    cert = new X509Certificate(normalizedInput(input));
  } catch {
    throw new Error("Invalid certificate.");
  }

  let forgeCert: forge.pki.Certificate | undefined;
  try {
    forgeCert = forge.pki.certificateFromPem(cert.toString());
  } catch {
    // Node's X509 parser remains the source of truth if optional extension parsing fails.
  }

  const extensions = (forgeCert?.extensions ?? []) as ForgeExtension[];
  const basicConstraints = extensions.find((extension) => extension.name === "basicConstraints");
  const keyUsage = extensions.find((extension) => extension.name === "keyUsage");
  const extKeyUsage = extensions.find((extension) => extension.name === "extKeyUsage");
  const crlDistributionPoints = extensions.find((extension) => extension.name === "cRLDistributionPoints");

  return {
    subject: cert.subject,
    issuer: cert.issuer,
    serialNumber: cert.serialNumber,
    validFrom: cert.validFrom,
    validTo: cert.validTo,
    fingerprint256: cert.fingerprint256,
    fingerprint512: cert.fingerprint512,
    key: keyDetails(cert),
    signatureAlgorithm: forgeCert?.siginfo.algorithmOid ? signatureAlgorithms[forgeCert.siginfo.algorithmOid] ?? forgeCert.siginfo.algorithmOid : undefined,
    certificateAuthority: cert.ca || Boolean(basicConstraints?.cA),
    subjectAltNames: subjectAltNames(cert.subjectAltName),
    authorityInfoAccess: splitLines(cert.infoAccess),
    crlDistributionPoints: extensionUrls(crlDistributionPoints),
    keyUsage: extensionValue(keyUsage, "keyUsage"),
    extendedKeyUsage: extensionValue(extKeyUsage, "extKeyUsage")
  };
}
