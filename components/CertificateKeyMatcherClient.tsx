"use client";

import { CircleCheck, FileKey2, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import type { Locale } from "@/lib/i18n";
import type { CertificateKeyMatchResponse } from "@/lib/types";

type MatchResponse = { result: CertificateKeyMatchResponse } | { error: string };

export function CertificateKeyMatcherClient({ locale }: { locale: Locale }) {
  const es = locale === "es";
  const [certificate, setCertificate] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [result, setResult] = useState<CertificateKeyMatchResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!certificate.trim() || !privateKey.trim()) {
      setError(es ? "Introduce el certificado y la clave privada PEM." : "Enter both the PEM certificate and private key.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/certificate/key-match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ certificate, privateKey, locale })
      });
      const payload = await response.json() as MatchResponse;
      if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error : "Certificate key match failed.");
      setResult(payload.result);
    } catch (matchError) {
      setError(matchError instanceof Error ? matchError.message : es ? "No se pudo completar la comprobación." : "The check could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setCertificate("");
    setPrivateKey("");
    setResult(null);
    setError("");
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="tool-form p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <PemInput id="match-certificate" label={es ? "Certificado PEM" : "PEM certificate"} value={certificate} onChange={setCertificate} placeholder="-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----" />
          <PemInput id="match-private-key" label={es ? "Clave privada PEM" : "PEM private key"} value={privateKey} onChange={setPrivateKey} placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----" sensitive />
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm font-semibold leading-6 text-ink/60">{es ? "Se procesa solo en memoria, sin caché ni registro del contenido. Usa únicamente claves que puedas enviar a este servicio." : "Processed in memory only, with no cache or content logging. Only use keys you are permitted to send to this service."}</p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={clear} title={es ? "Limpiar" : "Clear"} aria-label={es ? "Limpiar" : "Clear"} className="grid h-12 w-12 place-items-center border border-line bg-white text-ink/60 transition hover:border-fault hover:text-fault"><Trash2 size={18} /></button>
            <button disabled={loading} className="inline-flex h-12 items-center justify-center gap-2 bg-night px-5 font-black text-white transition hover:bg-signal disabled:cursor-not-allowed disabled:opacity-60"><FileKey2 size={18} />{es ? "Comprobar coincidencia" : "Check match"}</button>
          </div>
        </div>
      </form>
      {loading ? <div className="mt-8"><LoadingState locale={locale} label={es ? "Comprobando certificado y clave" : "Checking certificate and key"} /></div> : null}
      {error ? <div className="mt-8"><ErrorState locale={locale} message={error} /></div> : null}
      {result ? <MatchResult result={result} locale={locale} /> : null}
    </div>
  );
}

function PemInput({ id, label, value, onChange, placeholder, sensitive = false }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string; sensitive?: boolean }) {
  return <div><label htmlFor={id} className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-ink/55">{label}</label><textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} spellCheck={false} wrap="off" className={`min-h-64 w-full resize-y overflow-x-auto whitespace-pre break-normal border border-line bg-white px-4 py-3 font-mono text-sm leading-6 text-night outline-none transition [overflow-wrap:normal] [word-break:normal] focus:border-signal focus:ring-4 focus:ring-signal/15 ${sensitive ? "selection:bg-warn/25" : ""}`} /></div>;
}

function MatchResult({ result, locale }: { result: CertificateKeyMatchResponse; locale: Locale }) {
  const es = locale === "es";
  const icon = result.matches ? <CircleCheck size={23} className="text-secure" /> : <ShieldAlert size={23} className="text-fault" />;
  const title = result.matches ? es ? "El certificado y la clave privada coinciden" : "The certificate and private key match" : es ? "El certificado y la clave privada no coinciden" : "The certificate and private key do not match";
  return (
    <section className={`mt-10 border-t-2 pt-5 ${result.matches ? "border-secure" : "border-fault"}`}>
      <div className="flex items-center gap-3">{icon}<h2 className="font-serif text-3xl font-semibold text-night">{title}</h2></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <MatchPanel title={es ? "Certificado" : "Certificate"} values={[["Subject", result.certificate.subject], [es ? "Emisor" : "Issuer", result.certificate.issuer], ["SHA256", result.certificate.fingerprint256], [es ? "Clave pública" : "Public key", [result.certificate.keyType, result.certificate.keyDetails].filter(Boolean).join(" ")]]} />
        <MatchPanel title={es ? "Clave privada" : "Private key"} values={[[es ? "Algoritmo" : "Algorithm", [result.privateKey.keyType, result.privateKey.keyDetails].filter(Boolean).join(" ")], [es ? "Resultado" : "Result", result.matches ? es ? "Compatible" : "Compatible" : es ? "No compatible" : "Not compatible"]]} />
      </div>
    </section>
  );
}

function MatchPanel({ title, values }: { title: string; values: Array<[string, string]> }) {
  return <section className="report-section"><h3 className="text-sm font-black uppercase tracking-[0.14em] text-night">{title}</h3><dl className="mt-4 space-y-3">{values.map(([label, value]) => <div key={label} className="border-t border-line pt-3 first:border-t-0 first:pt-0"><dt className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">{label}</dt><dd className="mt-1 break-words text-sm font-semibold leading-6 text-ink/75">{value || "-"}</dd></div>)}</dl></section>;
}
