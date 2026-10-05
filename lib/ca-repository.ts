import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedCrossSigns: X509Certificate[] | null = null;

function splitPemBundle(pemBundle: string) {
  return pemBundle.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [];
}

export function getRepositoryCrossSigns() {
  if (cachedCrossSigns) return cachedCrossSigns;

  const path = join(process.cwd(), "data", "ca-repository", "cross-signs.pem");
  const pemBundle = readFileSync(path, "utf8");
  cachedCrossSigns = splitPemBundle(pemBundle).map((pem) => new X509Certificate(pem));
  return cachedCrossSigns;
}
