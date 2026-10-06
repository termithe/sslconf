"use client";

import { Braces, CircleCheck, FilePenLine, ListChecks, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { copy, type Locale } from "@/lib/i18n";
import type { DecodedCsrResponse } from "@/lib/types";

type CsrResponse = { csr: DecodedCsrResponse } | { error: string };

export function CsrDecoderClient({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [csr, setCsr] = useState("");
  const [result, setResult] = useState<DecodedCsrResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!csr.trim()) {
      setError(locale === "es" ? "Introduce una solicitud CSR para analizar." : "Enter a CSR to validate.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/csr/decode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csr, locale })
      });
      const payload = await response.json() as CsrResponse;
      if (!response.ok || "error" in payload) throw new Error("error" in payload ? payload.error : "CSR validation failed.");
      setResult(payload.csr);
    } catch (csrError) {
      setError(csrError instanceof Error ? csrError.message : text.errorTitle);
    } finally {
      setLoading(false);
    }
  }

  function clearCsr() {
    setCsr("");
    setError("");
    setResult(null);
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="tool-form p-5 sm:p-6">
        <div>
          <label htmlFor="csr-input" className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-ink/55">{text.csrInputLabel}</label>
          <div className="relative">
            <textarea
              id="csr-input"
              value={csr}
              onChange={(event) => setCsr(event.target.value)}
              placeholder={text.csrPlaceholder}
              spellCheck={false}
              className="min-h-56 w-full resize-y border border-line bg-white px-4 pb-3 pr-14 pt-3 font-mono text-sm leading-6 text-night outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/15"
            />
            <button type="button" onClick={clearCsr} disabled={!csr && !error && !result} title={text.csrClear} aria-label={text.csrClear} className="absolute right-3 top-3 grid h-9 w-9 place-items-center border border-line bg-white text-ink/55 transition hover:border-fault hover:text-fault disabled:cursor-not-allowed disabled:opacity-35">
              <Trash2 size={17} />
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-sm font-semibold leading-6 text-ink/60">{text.csrPrivacy}</p>
          <button disabled={loading} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 bg-night px-5 font-black text-white transition hover:bg-signal disabled:cursor-not-allowed disabled:opacity-60">
            <FilePenLine size={18} />
            {text.csrSubmit}
          </button>
        </div>
      </form>

      {loading ? <div className="mt-8"><LoadingState locale={locale} label={text.csrLoading} /></div> : null}
      {error ? <div className="mt-8"><ErrorState locale={locale} message={error} /></div> : null}
      {result ? <CsrDetails locale={locale} result={result} /> : null}
    </div>
  );
}

function CsrDetails({ locale, result }: { locale: Locale; result: DecodedCsrResponse }) {
  const text = copy[locale];
  const key = [result.key.type, result.key.bits ? `${result.key.bits} bits` : ""].filter(Boolean).join(" ");

  return (
    <section className="mt-10 border-t-2 border-night pt-5">
      <h2 className="font-serif text-3xl font-semibold text-night">{text.csrResultTitle}</h2>
      <div className="mt-6 grid gap-x-8 lg:grid-cols-2">
        <CsrPanel title={text.decoderIdentity} icon={FilePenLine}>
          <CsrKeyValue label="Subject" value={result.subject} />
          <CsrKeyValue label={text.decoderSan} value={result.subjectAltNames.length ? result.subjectAltNames.join(", ") : text.decoderNoValues} />
        </CsrPanel>
        <CsrPanel title={text.decoderCryptography} icon={Braces}>
          <CsrKeyValue label={text.csrPublicKey} value={key || text.decoderNoValues} />
          <CsrKeyValue label="Signature" value={result.signatureAlgorithm ?? text.decoderNoValues} />
          <CsrKeyValue label={text.csrSignature} value={result.signatureValid ? text.valid : text.invalid} />
        </CsrPanel>
      </div>
      <CsrPanel title={text.csrRequestedExtensions} icon={ShieldCheck} className="mt-6">
        <CsrList values={result.requestedExtensions} empty={text.decoderNoValues} />
      </CsrPanel>
      <CsrPanel title={text.csrFindings} icon={ListChecks} className="mt-6">
        <div className="space-y-3">
          {result.findings.map((finding) => <Finding key={`${finding.level}-${finding.title}`} finding={finding} />)}
        </div>
      </CsrPanel>
    </section>
  );
}

function CsrPanel({ title, icon: Icon, className = "", children }: { title: string; icon: typeof FilePenLine; className?: string; children: React.ReactNode }) {
  return <section className={`report-section ${className}`}><h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.14em] text-night"><Icon size={17} className="text-signal" />{title}</h3><div className="mt-4 space-y-3">{children}</div></section>;
}

function CsrKeyValue({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 border-t border-line pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4"><dt className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">{label}</dt><dd className="break-words text-sm font-semibold leading-6 text-ink/75">{value}</dd></div>;
}

function CsrList({ values, empty }: { values: string[]; empty: string }) {
  if (!values.length) return <p className="text-sm font-semibold text-ink/55">{empty}</p>;
  return <ul className="space-y-1.5 text-sm font-semibold leading-6 text-ink/75">{values.map((value) => <li key={value}>{value}</li>)}</ul>;
}

function Finding({ finding }: { finding: DecodedCsrResponse["findings"][number] }) {
  const color = finding.level === "fail" ? "border-fault/30 bg-fault/5" : finding.level === "warning" ? "border-amber/30 bg-amber/5" : finding.level === "pass" ? "border-secure/30 bg-vault/50" : "border-line bg-white";
  return <div className={`border-l-4 p-4 ${color}`}><div className="flex items-center gap-2 text-sm font-black text-night"><CircleCheck size={17} className={finding.level === "fail" ? "text-fault" : finding.level === "warning" ? "text-amber" : "text-secure"} />{finding.title}</div><p className="mt-2 text-sm font-semibold leading-6 text-ink/70">{finding.detail}</p></div>;
}
