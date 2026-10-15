"use client";

import { CheckCircle2, CircleAlert, CircleX, ClipboardCheck, FileSearch, Info, type LucideIcon } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import type { Locale } from "@/lib/i18n";
import type { HttpSecurityHeaderCheck, HttpSecurityHeadersResponse } from "@/lib/types";

function text(locale: Locale) {
  return locale === "es"
    ? { input: "Dominio o URL HTTPS", placeholder: "Introduce un dominio o https:// URL", submit: "Analizar cabeceras", empty: "Introduce un dominio.", loading: "Analizando cabeceras de seguridad", report: "Informe de cabeceras", checks: "Comprobaciones", observed: "Cabeceras observadas", finalUrl: "URL final", status: "Estado HTTP", redirects: "Redirecciones", noHeaders: "No se observaron cabeceras de seguridad en la respuesta final." }
    : { input: "Domain or HTTPS URL", placeholder: "Enter a domain or https:// URL", submit: "Analyze headers", empty: "Enter a domain.", loading: "Analyzing security headers", report: "Headers report", checks: "Checks", observed: "Observed headers", finalUrl: "Final URL", status: "HTTP status", redirects: "Redirects", noHeaders: "No security headers were observed on the final response." };
}

export function HttpSecurityHeadersClient({ defaultHost = "", locale }: { defaultHost?: string; locale: Locale }) {
  const [host, setHost] = useState(defaultHost);
  const [inputError, setInputError] = useState("");
  const [result, setResult] = useState<HttpSecurityHeadersResponse | null>(null);
  const [error, setError] = useState("");
  const labels = text(locale);

  useEffect(() => {
    if (!defaultHost) return;
    const controller = new AbortController();
    setResult(null); setError("");
    fetch("/api/http/headers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ host: defaultHost, locale }), signal: controller.signal })
      .then(async (response) => { const payload = await response.json() as HttpSecurityHeadersResponse & { error?: string }; if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`); setResult(payload); })
      .catch((caught) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unexpected error."); });
    return () => controller.abort();
  }, [defaultHost, locale]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!host.trim()) { setInputError(labels.empty); return; }
    setInputError("");
    window.location.assign(`${locale === "es" ? "/es" : ""}/headers?${new URLSearchParams({ host: host.trim() }).toString()}`);
  }

  return <div><form onSubmit={submit} className="tool-form border-l-secure p-5 sm:p-6"><div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"><label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-ink/55">{labels.input}</span><input value={host} onChange={(event) => setHost(event.target.value)} placeholder={labels.placeholder} className="h-14 w-full border border-line bg-white px-4 text-lg font-semibold text-night outline-none transition focus:border-secure focus:ring-4 focus:ring-secure/15" /></label><button className="inline-flex h-14 items-center justify-center gap-2 bg-signal px-6 font-black text-white transition hover:bg-night"><ClipboardCheck size={18} />{labels.submit}</button></div>{inputError ? <p className="mt-3 text-sm font-bold text-fault">{inputError}</p> : null}</form>{!defaultHost ? null : error ? <div className="mt-6"><ErrorState locale={locale} message={error} /></div> : !result ? <div className="mt-6"><LoadingState locale={locale} label={labels.loading} /></div> : <HeaderReport result={result} labels={labels} />}</div>;
}

function HeaderReport({ result, labels }: { result: HttpSecurityHeadersResponse; labels: ReturnType<typeof text> }) {
  const tone = result.grade.startsWith("A") ? "border-secure bg-secure/10" : result.grade === "B" ? "border-amber bg-amber/10" : "border-fault bg-fault/10";
  return <section className="mt-8"><div className={`border-l-4 p-5 sm:p-6 ${tone}`}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex gap-3"><FileSearch size={25} className="mt-1 text-signal" /><div><p className="text-xs font-black uppercase tracking-[0.16em] text-ink/55">{labels.report}</p><h2 className="mt-1 font-serif text-3xl font-semibold text-night">{result.grade} <span className="font-sans text-base font-black text-ink/60">{result.score}/100</span></h2><p className="mt-2 text-sm font-semibold text-ink/70">{result.host}:{result.port}</p></div></div><dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-right text-xs font-bold text-ink/65"><dt>{labels.status}</dt><dd className="text-night">{result.statusCode}</dd><dt>{labels.redirects}</dt><dd className="text-night">{result.redirects}</dd></dl></div></div><div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><section className="report-section"><Title icon={ClipboardCheck} title={labels.checks} /><div className="mt-5 divide-y divide-line border-y border-line">{result.checks.map((item) => <CheckRow key={item.id} check={item} />)}</div></section><section className="report-section"><Title icon={FileSearch} title={labels.observed} /><dl className="mt-5 space-y-3"><Data label={labels.finalUrl} value={result.finalUrl} />{Object.entries(result.observed).map(([name, value]) => <Data key={name} label={name} value={value} mono />)}{Object.keys(result.observed).length === 0 ? <p className="text-sm font-semibold text-ink/65">{labels.noHeaders}</p> : null}</dl></section></div></section>;
}

function Title({ icon: Icon, title }: { icon: LucideIcon; title: string }) { return <div className="flex items-center gap-3 text-night"><Icon size={20} className="text-signal" /><h2 className="text-sm font-black uppercase tracking-[0.16em]">{title}</h2></div>; }
function CheckRow({ check }: { check: HttpSecurityHeaderCheck }) { const status = check.status === "pass" ? <CheckCircle2 size={24} className="mt-1 text-secure" /> : check.status === "info" ? <Info size={24} className="mt-1 text-ink/45" /> : check.status === "warning" ? <CircleAlert size={24} className="mt-1 text-amber" /> : <CircleX size={24} className="mt-1 text-fault" />; const color = check.status === "pass" ? "text-secure" : check.status === "info" ? "text-ink/65" : check.status === "warning" ? "text-amber" : "text-fault"; return <div className="flex gap-3 px-1 py-4">{status}<div><h3 className={`font-black ${color}`}>{check.title}</h3><p className="mt-1 text-sm font-semibold leading-6 text-ink/65">{check.detail}</p></div></div>; }
function Data({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="grid gap-1 border-t border-line pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4"><dt className="break-words text-xs font-black uppercase tracking-[0.1em] text-ink/45">{label}</dt><dd className={`break-words text-sm font-semibold leading-6 text-ink/75 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>; }
