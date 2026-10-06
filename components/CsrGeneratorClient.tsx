"use client";

import { Copy, Download, FileKey2, FilePenLine, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

type KeyChoice = "rsa-2048" | "rsa-3072" | "ec-p256" | "ec-p384";
type GeneratedCsr = { csr: string; privateKey: string; algorithm: string };

const encoder = new TextEncoder();
const extensionRequestOid = "1.2.840.113549.1.9.14";
const sanOid = "2.5.29.17";

export function CsrGeneratorClient({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const [commonName, setCommonName] = useState("");
  const [organization, setOrganization] = useState("");
  const [organizationalUnit, setOrganizationalUnit] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [locality, setLocality] = useState("");
  const [sans, setSans] = useState("");
  const [choice, setChoice] = useState<KeyChoice>("rsa-2048");
  const [result, setResult] = useState<GeneratedCsr | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"csr" | "key" | null>(null);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    const cn = commonName.trim();
    if (!cn) {
      setError(es ? "Introduce el nombre común del certificado." : "Enter the certificate common name.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const generated = await generateCsr({ commonName: cn, organization, organizationalUnit, country, state, locality, sans, choice });
      setResult(generated);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : es ? "No se pudo generar la CSR." : "Could not generate the CSR.");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setCommonName(""); setOrganization(""); setOrganizationalUnit(""); setCountry(""); setState(""); setLocality(""); setSans(""); setResult(null); setError("");
  }

  return <div>
    <form onSubmit={generate} className="tool-form p-5 sm:p-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <FormField label={es ? "Nombre común (CN)" : "Common name (CN)"} value={commonName} onChange={setCommonName} placeholder="example.com" required />
        <SelectField locale={locale} value={choice} onChange={setChoice} />
        <FormField label={es ? "Organización (O)" : "Organization (O)"} value={organization} onChange={setOrganization} placeholder={es ? "Opcional" : "Optional"} />
        <FormField label={es ? "Unidad organizativa (OU)" : "Organizational unit (OU)"} value={organizationalUnit} onChange={setOrganizationalUnit} placeholder={es ? "Opcional" : "Optional"} />
        <FormField label={es ? "País (C)" : "Country (C)"} value={country} onChange={setCountry} placeholder="ES" maxLength={2} />
        <FormField label={es ? "Provincia/estado (ST)" : "State/province (ST)"} value={state} onChange={setState} placeholder={es ? "Opcional" : "Optional"} />
        <FormField label={es ? "Localidad (L)" : "Locality (L)"} value={locality} onChange={setLocality} placeholder={es ? "Opcional" : "Optional"} />
        <div className="md:col-span-2 xl:col-span-2"><FormField label={es ? "Nombres alternativos DNS (SAN)" : "DNS subject alternative names (SAN)"} value={sans} onChange={setSans} placeholder="www.example.com, api.example.com" /></div>
      </div>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-sm font-semibold leading-6 text-ink/60">{es ? "La clave se genera y permanece en este navegador. Descárgala y guárdala de forma segura: no se puede recuperar después." : "The key is generated and remains in this browser. Download and store it securely: it cannot be recovered later."}</p><div className="flex shrink-0 gap-2"><button type="button" onClick={clear} title={es ? "Limpiar" : "Clear"} aria-label={es ? "Limpiar" : "Clear"} className="grid h-12 w-12 place-items-center border border-line bg-white text-ink/60 transition hover:border-fault hover:text-fault"><Trash2 size={18} /></button><button disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 bg-night px-5 font-black text-white transition hover:bg-signal disabled:cursor-not-allowed disabled:opacity-60"><FilePenLine size={18} />{es ? "Generar CSR" : "Generate CSR"}</button></div></div>
    </form>
    {loading ? <div className="mt-8 border-l-4 border-signal bg-signal/8 p-5 text-sm font-bold text-ink/70">{es ? "Generando clave y CSR en el navegador..." : "Generating key and CSR in the browser..."}</div> : null}
    {error ? <div className="mt-8 border-l-4 border-fault bg-fault/8 p-5 text-sm font-bold text-fault">{error}</div> : null}
    {result ? <GeneratedResult result={result} locale={locale} copied={copied} setCopied={setCopied} /> : null}
  </div>;
}

function FormField({ label, value, onChange, placeholder, required, maxLength }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; required?: boolean; maxLength?: number }) {
  return <label className="block text-xs font-black uppercase tracking-[0.16em] text-ink/55">{label}<input value={value} required={required} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 h-11 w-full border border-line bg-white px-3 text-sm font-semibold normal-case tracking-normal text-night outline-none transition placeholder:text-ink/35 focus:border-signal focus:ring-4 focus:ring-signal/15" /></label>;
}

function SelectField({ locale, value, onChange }: { locale: Locale; value: KeyChoice; onChange: (value: KeyChoice) => void }) {
  return <label className="block text-xs font-black uppercase tracking-[0.16em] text-ink/55">{locale === "es" ? "Tipo de clave" : "Key type"}<select value={value} onChange={(event) => onChange(event.target.value as KeyChoice)} className="mt-2 h-11 w-full border border-line bg-white px-3 text-sm font-semibold normal-case tracking-normal text-night outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/15"><option value="rsa-2048">RSA 2048</option><option value="rsa-3072">RSA 3072</option><option value="ec-p256">ECDSA P-256</option><option value="ec-p384">ECDSA P-384</option></select></label>;
}

function GeneratedResult({ result, locale, copied, setCopied }: { result: GeneratedCsr; locale: Locale; copied: "csr" | "key" | null; setCopied: (value: "csr" | "key" | null) => void }) {
  const es = locale === "es";
  return <section className="mt-10 border-t-2 border-secure pt-5"><div className="flex items-center gap-3"><FileKey2 size={23} className="text-secure" /><h2 className="font-serif text-3xl font-semibold text-night">{es ? "CSR y clave privada generadas" : "CSR and private key generated"}</h2></div><p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-ink/65">{es ? `Algoritmo: ${result.algorithm}. Descarga la clave privada antes de cerrar esta página.` : `Algorithm: ${result.algorithm}. Download the private key before closing this page.`}</p><PemOutput label="CSR" value={result.csr} filename="certificate-request.csr" locale={locale} copied={copied === "csr"} onCopy={() => copyValue(result.csr, "csr", setCopied)} /><PemOutput label={es ? "Clave privada" : "Private key"} value={result.privateKey} filename="private-key.pem" locale={locale} copied={copied === "key"} onCopy={() => copyValue(result.privateKey, "key", setCopied)} /></section>;
}

function PemOutput({ label, value, filename, locale, copied, onCopy }: { label: string; value: string; filename: string; locale: Locale; copied: boolean; onCopy: () => void }) {
  const es = locale === "es";
  return <section className="report-section mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-black uppercase tracking-[0.14em] text-night">{label}</h3><div className="flex gap-2"><button onClick={onCopy} type="button" className="inline-flex h-9 items-center gap-2 border border-line bg-white px-3 text-xs font-black text-night"><Copy size={15} />{copied ? (es ? "Copiado" : "Copied") : (es ? "Copiar" : "Copy")}</button><button onClick={() => download(value, filename)} type="button" className="inline-flex h-9 items-center gap-2 bg-night px-3 text-xs font-black text-white"><Download size={15} />{es ? "Descargar" : "Download"}</button></div></div><pre className="mono-scroll mt-4 max-h-72 overflow-auto whitespace-pre-wrap break-words border border-line bg-white p-4 text-xs font-bold leading-6 text-night">{value}</pre></section>;
}

async function copyValue(value: string, type: "csr" | "key", setCopied: (value: "csr" | "key" | null) => void) { await navigator.clipboard.writeText(value); setCopied(type); window.setTimeout(() => setCopied(null), 1500); }
function download(value: string, filename: string) { const url = URL.createObjectURL(new Blob([value], { type: "application/x-pem-file" })); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }

async function generateCsr(input: { commonName: string; organization: string; organizationalUnit: string; country: string; state: string; locality: string; sans: string; choice: KeyChoice }): Promise<GeneratedCsr> {
  const isRsa = input.choice.startsWith("rsa");
  const namedCurve = input.choice === "ec-p256" ? "P-256" : "P-384";
  const algorithm = isRsa ? { name: "RSASSA-PKCS1-v1_5", modulusLength: input.choice === "rsa-2048" ? 2048 : 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" } : { name: "ECDSA", namedCurve };
  const pair = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
  if (!("privateKey" in pair) || !("publicKey" in pair)) throw new Error("Key pair generation failed.");
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const cri = certificationRequestInfo(input, spki);
  const hash = input.choice === "ec-p384" ? "SHA-384" : "SHA-256";
  const rawSignature = new Uint8Array(await crypto.subtle.sign(isRsa ? { name: "RSASSA-PKCS1-v1_5" } : { name: "ECDSA", hash: { name: hash } }, pair.privateKey, cri));
  const signature = isRsa ? rawSignature : ecdsaRawToDer(rawSignature);
  const signatureAlgorithm = isRsa ? derSequence(derOid("1.2.840.113549.1.1.11"), derNull()) : derSequence(derOid(input.choice === "ec-p384" ? "1.2.840.10045.4.3.3" : "1.2.840.10045.4.3.2"));
  const csr = derSequence(cri, signatureAlgorithm, derBitString(signature));
  const privateKey = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  return { csr: pem("CERTIFICATE REQUEST", csr), privateKey: pem("PRIVATE KEY", privateKey), algorithm: isRsa ? `RSA ${input.choice === "rsa-2048" ? "2048" : "3072"}` : `ECDSA ${namedCurve}` };
}

function certificationRequestInfo(input: { commonName: string; organization: string; organizationalUnit: string; country: string; state: string; locality: string; sans: string }, spki: Uint8Array) {
  const subject = [
    ["2.5.4.3", input.commonName, 0x0c], ["2.5.4.10", input.organization.trim(), 0x0c], ["2.5.4.11", input.organizationalUnit.trim(), 0x0c], ["2.5.4.6", input.country.trim().toUpperCase(), 0x13], ["2.5.4.8", input.state.trim(), 0x0c], ["2.5.4.7", input.locality.trim(), 0x0c]
  ].filter((entry) => entry[1]).map(([oid, value, tag]) => derSet(derSequence(derOid(String(oid)), derTlv(Number(tag), encoder.encode(String(value))))));
  const names = input.sans.split(",").map((value) => value.trim()).filter(Boolean);
  const extensions = names.length ? derSequence(derSequence(derOid(sanOid), derOctetString(derSequence(...names.map((name) => derTlv(0x82, encoder.encode(name))))))) : new Uint8Array();
  const attributes = names.length ? derTlv(0xa0, derSequence(derOid(extensionRequestOid), derSet(extensions))) : derTlv(0xa0, new Uint8Array());
  return derSequence(derInteger(new Uint8Array([0])), derSequence(...subject), spki, attributes);
}

function derTlv(tag: number, value: Uint8Array) { return concat(new Uint8Array([tag]), derLength(value.length), value); }
function derLength(length: number) { if (length < 128) return new Uint8Array([length]); const bytes: number[] = []; for (let value = length; value; value >>>= 8) bytes.unshift(value & 255); return new Uint8Array([0x80 | bytes.length, ...bytes]); }
function derSequence(...values: Uint8Array[]) { return derTlv(0x30, concat(...values)); }
function derSet(...values: Uint8Array[]) { return derTlv(0x31, concat(...values)); }
function derNull() { return new Uint8Array([0x05, 0]); }
function derOctetString(value: Uint8Array) { return derTlv(0x04, value); }
function derBitString(value: Uint8Array) { return derTlv(0x03, concat(new Uint8Array([0]), value)); }
function derInteger(value: Uint8Array) { let trimmed = value; while (trimmed.length > 1 && trimmed[0] === 0) trimmed = trimmed.slice(1); if (trimmed[0] & 0x80) trimmed = concat(new Uint8Array([0]), trimmed); return derTlv(0x02, trimmed); }
function derOid(oid: string) { const parts = oid.split(".").map(Number); const bytes = [parts[0] * 40 + parts[1]]; for (const value of parts.slice(2)) { const stack = [value & 0x7f]; for (let current = value >>> 7; current; current >>>= 7) stack.unshift((current & 0x7f) | 0x80); bytes.push(...stack); } return derTlv(0x06, new Uint8Array(bytes)); }
function concat(...values: Uint8Array[]) { const length = values.reduce((sum, value) => sum + value.length, 0); const out = new Uint8Array(length); let offset = 0; values.forEach((value) => { out.set(value, offset); offset += value.length; }); return out; }
function ecdsaRawToDer(raw: Uint8Array) { const half = raw.length / 2; return derSequence(derInteger(raw.slice(0, half)), derInteger(raw.slice(half))); }
function pem(label: string, bytes: Uint8Array) { let binary = ""; bytes.forEach((byte) => { binary += String.fromCharCode(byte); }); const base64 = btoa(binary).replace(/(.{64})/g, "$1\n"); return `-----BEGIN ${label}-----\n${base64}\n-----END ${label}-----\n`; }
