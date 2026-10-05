"use client";

import { CheckCircle2, Copy, Download, XCircle } from "lucide-react";
import { Link2 } from "lucide-react";
import { useState } from "react";
import { CertificateCard } from "./CertificateCard";
import { copy, type Locale } from "@/lib/i18n";
import type { TLSChainResponse } from "@/lib/types";

export function TLSChainResult({ result, locale = "en" }: { result: TLSChainResponse; locale?: Locale }) {
  const filename = `${result.host.replace(/[^a-z0-9.-]/gi, "_")}-ca-bundle.pem`;
  const text = copy[locale];
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  async function copyPem() {
    await navigator.clipboard.writeText(result.pemBundle);
    markCopied("pem");
  }

  function downloadPem() {
    const blob = new Blob([result.pemBundle], { type: "application/x-pem-file" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyReport() {
    await navigator.clipboard.writeText(chainReportText(result, locale));
    markCopied("report");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    markCopied("link");
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.host.replace(/[^a-z0-9.-]/gi, "_")}-sslconf-chain.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function markCopied(action: string) {
    setCopiedAction(action);
    window.setTimeout(() => setCopiedAction(null), 1600);
  }

  return (
    <div className="space-y-5">
      <section className="report-masthead p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-ink/45">{result.host}:{result.port}</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-night">{text.resultTitle}</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-ink/70">{result.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copyPem} className={`inline-flex h-10 items-center gap-2 px-4 text-sm font-black transition ${copiedAction === "pem" ? "bg-secure text-white" : "border border-line bg-white text-night hover:border-signal"}`}>
              <Copy size={16} />
              {copiedAction === "pem" ? text.copied : text.copy}
            </button>
            <button onClick={downloadPem} className="inline-flex h-10 items-center gap-2 bg-night px-4 text-sm font-black text-white transition hover:bg-signal">
              <Download size={16} />
              {text.downloadPem}
            </button>
            <button onClick={copyReport} className={`inline-flex h-10 items-center gap-2 px-4 text-sm font-black transition ${copiedAction === "report" ? "bg-secure text-white" : "border border-line bg-white text-night hover:border-signal"}`}>
              <Copy size={16} />
              {copiedAction === "report" ? text.copied : text.copyReport}
            </button>
            <button onClick={downloadJson} className="inline-flex h-10 items-center gap-2 border border-line bg-white px-4 text-sm font-black text-night transition hover:border-signal">
              <Download size={16} />
              {text.downloadJson}
            </button>
            <button onClick={copyLink} className={`inline-flex h-10 items-center gap-2 px-4 text-sm font-black transition ${copiedAction === "link" ? "bg-secure text-white" : "border border-line bg-white text-night hover:border-signal"}`}>
              <Link2 size={16} />
              {copiedAction === "link" ? text.copied : text.copyLink}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatusPill ok={result.verified} label={result.verified ? text.valid : text.invalid} />
          <StatusPill ok={result.hostnameValid} label={result.hostnameValid ? text.hostnameValid : text.hostnameInvalid} />
          <StatusPill ok={result.status === "OK"} label={`${result.certificates.length} ${text.certsInBundle}`} />
        </div>
      </section>

      <section className="grid gap-4">
        {result.certificates.map((cert) => (
          <CertificateCard key={cert.fingerprint256} cert={cert} locale={locale} />
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="border border-night bg-night p-5 text-white shadow-[0_18px_48px_rgba(11,23,38,0.18)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black">{text.pemTitle}</h2>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">{filename}</span>
          </div>
          <pre className="mono-scroll max-h-[520px] overflow-auto whitespace-pre-wrap break-all text-xs leading-5 text-mint">{result.pemBundle}</pre>
        </div>

        <div className="border border-line bg-white/70 p-5">
          <h2 className="font-black text-night">{text.traceTitle}</h2>
          <ol className="mt-4 space-y-3">
            {result.steps.map((step, index) => (
              <li key={`${step.message}-${index}`} className="flex gap-3 text-sm font-semibold leading-6 text-ink/70">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${step.level === "ok" ? "bg-signal" : step.level === "error" ? "bg-fault" : "bg-amber"}`} />
                <span>{step.message}</span>
              </li>
            ))}
          </ol>
          {result.aiaUrls.length > 0 ? (
            <div className="mt-6 border-t border-line pt-4">
              <h3 className="text-xs font-black uppercase tracking-[0.16em] text-ink/45">AIA CA Issuers</h3>
              <ul className="mt-3 space-y-2">
                {result.aiaUrls.map((url) => (
                  <li key={url} className="break-all text-xs font-semibold text-ink/65">{url}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function chainReportText(result: TLSChainResponse, locale: Locale) {
  return [
    "SSLConf Chain Report",
    `Host: ${result.host}:${result.port}`,
    `Status: ${result.status}`,
    `Verified: ${result.verified}`,
    `Hostname valid: ${result.hostnameValid}`,
    `Bundle certificates: ${result.certificates.length}`,
    "",
    locale === "es" ? "Certificados:" : "Certificates:",
    ...result.certificates.map((cert) => `${cert.role} | ${cert.subject.replace(/\n/g, " ")} | source=${cert.source}`),
    "",
    locale === "es" ? "Trazado:" : "Trace:",
    ...result.steps.map((step) => `[${step.level}] ${step.message}`)
  ].join("\n");
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <div className={`flex items-center gap-2 border px-4 py-3 text-sm font-black ${ok ? "border-secure/25 bg-vault text-secure" : "border-fault/20 bg-white text-fault"}`}>
      <Icon size={18} />
      {label}
    </div>
  );
}
