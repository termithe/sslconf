"use client";

import { Braces, FileSearch, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { copy, type Locale } from "@/lib/i18n";
import type { DecodedCertificateResponse } from "@/lib/types";

type DecodeResponse = { certificate: DecodedCertificateResponse } | { error: string };

export function CertificateDecoderClient({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [certificate, setCertificate] = useState("");
  const [result, setResult] = useState<DecodedCertificateResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!certificate.trim()) {
      setError(locale === "es" ? "Introduce un certificado para analizar." : "Enter a certificate to decode.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/certificate/decode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ certificate, locale })
      });
      const payload = await response.json() as DecodeResponse;
      if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error : "Decode failed.");
      setResult(payload.certificate);
    } catch (decodeError) {
      setError(decodeError instanceof Error ? decodeError.message : text.errorTitle);
    } finally {
      setLoading(false);
    }
  }

  function clearCertificate() {
    setCertificate("");
    setError("");
    setResult(null);
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="tool-form p-5 sm:p-6">
        <div>
          <label htmlFor="certificate-input" className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-ink/55">{text.decoderInputLabel}</label>
          <div className="relative">
            <textarea
              id="certificate-input"
              value={certificate}
              onChange={(event) => setCertificate(event.target.value)}
              placeholder={text.decoderPlaceholder}
              spellCheck={false}
              wrap="off"
              className="min-h-56 w-full resize-y overflow-x-auto whitespace-pre break-normal border border-line bg-white px-4 pb-3 pr-14 pt-3 font-mono text-sm leading-6 text-night outline-none transition [overflow-wrap:normal] [word-break:normal] focus:border-signal focus:ring-4 focus:ring-signal/15"
            />
            <button
              type="button"
              onClick={clearCertificate}
              disabled={!certificate && !error && !result}
              title={text.decoderClear}
              aria-label={text.decoderClear}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center border border-line bg-white text-ink/55 transition hover:border-fault hover:text-fault disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm font-semibold leading-6 text-ink/60">{text.decoderPrivacy}</p>
          <button disabled={loading} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-night px-5 font-black text-white transition hover:bg-signal disabled:cursor-not-allowed disabled:opacity-60">
            <FileSearch size={18} />
            {text.decoderSubmit}
          </button>
        </div>
      </form>

      {loading ? <div className="mt-8"><LoadingState locale={locale} label={text.decoderLoading} /></div> : null}
      {error ? <div className="mt-8"><ErrorState locale={locale} message={error} /></div> : null}
      {result ? <CertificateDetails locale={locale} result={result} /> : null}
    </div>
  );
}

function CertificateDetails({ locale, result }: { locale: Locale; result: DecodedCertificateResponse }) {
  const text = copy[locale];
  const key = [result.key.type, result.key.bits ? `${result.key.bits} bits` : "", result.key.curve].filter(Boolean).join(" ");

  return (
    <section className="mt-10 border-t-2 border-night pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-3xl font-semibold text-night">{text.decoderResultTitle}</h2>
        <span className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${result.certificateAuthority ? "bg-mint text-signal" : "bg-vault text-secure"}`}>
          <ShieldCheck size={16} />
          {text.decoderCertificateAuthority}: {result.certificateAuthority ? text.decoderYes : text.decoderNo}
        </span>
      </div>

      <div className="mt-6 grid gap-x-8 lg:grid-cols-2">
        <DetailPanel title={text.decoderIdentity} icon={FileSearch}>
          <KeyValue label="Subject" value={result.subject} />
          <KeyValue label={text.issuer} value={result.issuer} />
          <KeyValue label="Serial" value={result.serialNumber} />
          <KeyValue label={text.validity} value={`${result.validFrom} - ${result.validTo}`} />
        </DetailPanel>
        <DetailPanel title={text.decoderCryptography} icon={Braces}>
          <KeyValue label="SHA-256" value={result.fingerprint256} mono />
          <KeyValue label="SHA-512" value={result.fingerprint512 ?? text.decoderNoValues} mono />
          <KeyValue label="Key" value={key || text.decoderNoValues} />
          <KeyValue label="Signature" value={result.signatureAlgorithm ?? text.decoderNoValues} />
        </DetailPanel>
      </div>

      <DetailPanel title={text.decoderExtensions} icon={ShieldCheck} className="mt-6">
        <ValueList label={text.decoderSan} values={result.subjectAltNames} empty={text.decoderNoValues} />
        <ValueList label={text.decoderKeyUsage} values={result.keyUsage} empty={text.decoderNoValues} />
        <ValueList label={text.decoderExtendedKeyUsage} values={result.extendedKeyUsage} empty={text.decoderNoValues} />
        <ValueList label={text.decoderAia} values={result.authorityInfoAccess} empty={text.decoderNoValues} mono />
        <ValueList label={text.decoderCrl} values={result.crlDistributionPoints} empty={text.decoderNoValues} mono />
      </DetailPanel>
    </section>
  );
}

function DetailPanel({ title, icon: Icon, className = "", children }: { title: string; icon: typeof FileSearch; className?: string; children: React.ReactNode }) {
  return (
    <section className={`report-section ${className}`}>
      <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-night"><Icon size={17} className="text-signal" />{title}</h3>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function KeyValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-1 border-t border-line pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">{label}</dt>
      <dd className={`break-words text-sm font-semibold leading-6 text-ink/75 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function ValueList({ label, values, empty, mono = false }: { label: string; values: string[]; empty: string; mono?: boolean }) {
  return (
    <div className="border-t border-line py-4 first:border-t-0 first:pt-0">
      <h4 className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">{label}</h4>
      {values.length ? (
        <ul className={`mt-2 space-y-1.5 break-words text-sm font-semibold leading-6 text-ink/75 ${mono ? "font-mono text-xs" : ""}`}>
          {values.map((value) => <li key={value}>{value}</li>)}
        </ul>
      ) : <p className="mt-2 text-sm font-semibold text-ink/55">{empty}</p>}
    </div>
  );
}
