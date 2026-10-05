import { X509Certificate } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import tls from "node:tls";

const root = process.cwd();
const seedsPath = join(root, "data", "ca-repository", "seeds.json");
const outputPath = join(root, "data", "ca-repository", "cross-signs.pem");
const seeds = JSON.parse(readFileSync(seedsPath, "utf8"));
const trustRoots = tls.rootCertificates.map((pem) => new X509Certificate(pem));
const ccadbYears = Array.isArray(seeds.ccadbNotBeforeYears) && seeds.ccadbNotBeforeYears.length
  ? seeds.ccadbNotBeforeYears
  : Array.from({ length: 6 }, (_, index) => new Date().getUTCFullYear() - index);

function splitPemBundle(pemBundle) {
  return pemBundle.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g) ?? [];
}

function isTimeValid(cert, at = new Date()) {
  return new Date(cert.validFrom) <= at && at <= new Date(cert.validTo);
}

function isSelfSignedRoot(cert) {
  return cert.ca && cert.subject === cert.issuer && cert.verify(cert.publicKey);
}

function subjectCommonName(cert) {
  return cert.subject
    .split("\n")
    .map((part) => part.trim())
    .find((part) => part.startsWith("CN="))
    ?.slice(3);
}

function findIssuer(cert, candidates) {
  return candidates.find((candidate) => isTimeValid(candidate) && cert.checkIssued(candidate) && cert.verify(candidate.publicKey));
}

function parseCert(buffer) {
  const text = buffer.toString("utf8");
  return new X509Certificate(text.includes("-----BEGIN CERTIFICATE-----") ? text : buffer);
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function entryScore(entry) {
  const issuer = String(entry.issuer_name ?? "").toLowerCase();
  let score = 0;
  if (issuer.includes("entrust root certification authority - g2")) score += 100;
  if (!issuer.includes("ssl corporation")) score += 20;
  const notAfter = entry.not_after ? new Date(entry.not_after).getTime() : Number.MAX_SAFE_INTEGER;
  score -= Math.max(0, Math.floor((notAfter - Date.now()) / (365 * 24 * 60 * 60 * 1000)));
  return score;
}

function certScore(cert) {
  const issuer = cert.issuer.toLowerCase();
  let score = 0;
  if (issuer.includes("entrust root certification authority - g2")) score += 100;
  if (!issuer.includes("ssl corporation")) score += 20;
  score -= Math.max(0, Math.floor((new Date(cert.validTo).getTime() - Date.now()) / (365 * 24 * 60 * 60 * 1000)));
  return score;
}

async function findCrossSigns(commonName) {
  const url = `https://crt.sh/?q=${encodeURIComponent(commonName)}&output=json`;
  const response = await fetchWithTimeout(url, 30000);
  if (!response.ok) throw new Error(`crt.sh search failed for ${commonName}: HTTP ${response.status}`);

  const now = Date.now();
  const entries = await response.json();
  const ids = Array.from(new Set(entries
    .filter((entry) =>
      entry.id &&
      entry.name_value === commonName &&
      entry.not_before &&
      entry.not_after &&
      new Date(entry.not_before).getTime() <= now &&
      now <= new Date(entry.not_after).getTime()
    )
    .sort((a, b) => entryScore(b) - entryScore(a))
    .map((entry) => entry.id)))
    .slice(0, 20);

  const certificates = [];
  for (const id of ids) {
    try {
      const certResponse = await fetchWithTimeout(`https://crt.sh/?d=${id}`, 10000);
      if (!certResponse.ok) continue;
      const cert = parseCert(Buffer.from(await certResponse.arrayBuffer()));
      if (!cert.ca || isSelfSignedRoot(cert) || !isTimeValid(cert)) continue;
      if (!findIssuer(cert, trustRoots)) continue;
      certificates.push(cert);
    } catch {
      // Individual crt.sh downloads are best effort.
    }
  }

  certificates.sort((a, b) => certScore(b) - certScore(a));
  return certificates;
}

async function findCcadbCrossSigns(commonName) {
  const certificates = [];
  const seen = new Set();

  for (const year of ccadbYears) {
    const url = `https://ccadb.my.salesforce-sites.com/ccadb/AllCertificatePEMsCSVFormat?NotBeforeYear=${encodeURIComponent(year)}`;
    try {
      const response = await fetchWithTimeout(url, 45000);
      if (!response.ok) {
        console.warn(`  CCADB ${year}: HTTP ${response.status}`);
        continue;
      }

      const csv = await response.text();
      const pems = splitPemBundle(csv);
      let accepted = 0;

      for (const pem of pems) {
        try {
          const cert = new X509Certificate(pem);
          if (seen.has(cert.fingerprint256)) continue;
          if (subjectCommonName(cert) !== commonName) continue;
          if (!cert.ca || isSelfSignedRoot(cert) || !isTimeValid(cert)) continue;
          if (!findIssuer(cert, trustRoots)) continue;
          seen.add(cert.fingerprint256);
          certificates.push(cert);
          accepted += 1;
        } catch {
          // Individual CCADB rows are best effort.
        }
      }

      console.log(`  CCADB ${year}: scanned ${pems.length}, accepted ${accepted}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  CCADB ${year}: skipped: ${message}`);
    }
  }

  certificates.sort((a, b) => certScore(b) - certScore(a));
  return certificates;
}

const existing = splitPemBundle(readFileSync(outputPath, "utf8")).map((pem) => new X509Certificate(pem));
const byFingerprint = new Map(existing.map((cert) => [cert.fingerprint256, cert]));

for (const commonName of seeds.crossSignSubjects ?? []) {
  console.log(`Searching cross-signs for ${commonName}`);
  let found = [];

  try {
    found = await findCrossSigns(commonName);
    console.log(`  crt.sh accepted ${found.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  crt.sh skipped: ${message}`);
  }

  if (found.length === 0) {
    found = await findCcadbCrossSigns(commonName);
    console.log(`  CCADB accepted ${found.length}`);
  }

  for (const cert of found) byFingerprint.set(cert.fingerprint256, cert);
}

const output = Array.from(byFingerprint.values())
  .filter((cert) => cert.ca && !isSelfSignedRoot(cert) && isTimeValid(cert) && findIssuer(cert, trustRoots))
  .sort((a, b) => a.subject.localeCompare(b.subject) || certScore(b) - certScore(a))
  .map((cert) => cert.toString().trim())
  .join("\n");

writeFileSync(outputPath, `${output}\n`, "utf8");
console.log(`Wrote ${splitPemBundle(output).length} certificates to ${outputPath}`);
