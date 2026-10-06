import { createPrivateKey, createPublicKey, timingSafeEqual, X509Certificate } from "node:crypto";
import type { CertificateKeyMatchResponse } from "./types";

function firstCertificatePem(value: string) {
  const match = value.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/);
  if (!match) throw new Error("invalid certificate");
  return match[0];
}

function keyDetails(key: ReturnType<typeof createPublicKey>) {
  const details = key.asymmetricKeyDetails;
  if (!details) return undefined;
  if ("modulusLength" in details && details.modulusLength) return `${details.modulusLength} bits`;
  if ("namedCurve" in details && details.namedCurve) return details.namedCurve;
  return undefined;
}

export function matchCertificateAndKey(certificatePem: string, privateKeyPem: string): CertificateKeyMatchResponse {
  if (/-----BEGIN ENCRYPTED PRIVATE KEY-----/i.test(privateKeyPem)) throw new Error("encrypted private key");

  const certificate = new X509Certificate(firstCertificatePem(certificatePem));
  const privateKey = createPrivateKey(privateKeyPem);
  const certificatePublicKey = certificate.publicKey;
  const privatePublicKey = createPublicKey(privateKey);
  const certificateDer = certificatePublicKey.export({ format: "der", type: "spki" });
  const privateDer = privatePublicKey.export({ format: "der", type: "spki" });
  const matches = certificateDer.length === privateDer.length && timingSafeEqual(certificateDer, privateDer);

  return {
    matches,
    certificate: {
      subject: certificate.subject,
      issuer: certificate.issuer,
      fingerprint256: certificate.fingerprint256,
      keyType: certificatePublicKey.asymmetricKeyType,
      keyDetails: keyDetails(certificatePublicKey)
    },
    privateKey: {
      keyType: privatePublicKey.asymmetricKeyType,
      keyDetails: keyDetails(privatePublicKey)
    }
  };
}
