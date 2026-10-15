"use client";

import { CheckCircle2, CircleAlert, CircleX, ClipboardCheck, Radar, Server, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import type { Locale } from "@/lib/i18n";
import type { TlsInstallationCheck, TlsInstallationResponse } from "@/lib/types";

type Labels = {
  input: string; placeholder: string; submit: string; empty: string; loading: string; title: string; checks: string; certificate: string; endpoints: string; served: string; expires: string; issuer: string; fingerprint: string; chain: string; days: string; checked: string; scanned: string; inconsistent: string; unavailable: string; consistent: string;
};

function labels(locale: Locale): Labels {
  return locale === "es"
    ? { input: "Dominio o URL HTTPS", placeholder: "Introduce un dominio o https:// URL", submit: "Validar instalación", empty: "Introduce un dominio.", loading: "Validando la instalación TLS", title: "Validación de instalación", checks: "Comprobaciones", certificate: "Certificado servido", endpoints: "Endpoints públicos", served: "Certificados enviados", expires: "Caduca", issuer: "Emisor", fingerprint: "SHA256", chain: "Cadena", days: "Días restantes", checked: "Comprobado", scanned: "IPs comprobadas", inconsistent: "Inconsistente", unavailable: "Sin respuesta", consistent: "Coherente" }
    : { input: "Domain or HTTPS URL", placeholder: "Enter a domain or https:// URL", submit: "Validate installation", empty: "Enter a domain.", loading: "Validating TLS installation", title: "Installation validation", checks: "Checks", certificate: "Served certificate", endpoints: "Public endpoints", served: "Certificates supplied", expires: "Expires", issuer: "Issuer", fingerprint: "SHA256", chain: "Chain", days: "Days remaining", checked: "Checked", scanned: "IPs checked", inconsistent: "Inconsistent", unavailable: "Unavailable", consistent: "Consistent" };
}

export function TLSInstallationValidator({ defaultHost = "", locale }: { defaultHost?: string; locale: Locale }) {
  const [host, setHost] = useState(defaultHost);
  const [inputError, setInputError] = useState("");
  const [result, setResult] = useState<TlsInstallationResponse | null>(null);
  const [error, setError] = useState("");
  const text = labels(locale);

  useEffect(() => {
    if (!defaultHost) return;
    const controller = new AbortController();
    setResult(null);
    setError("");
    fetch("/api/tls/installation", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ host: defaultHost, locale }), signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as TlsInstallationResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);
        setResult(payload);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unexpected error.");
      });
    return () => controller.abort();
  }, [defaultHost, locale]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!host.trim()) {
      setInputError(text.empty);
      return;
    }
    setInputError("");
    window.location.assign(`${locale === "es" ? "/es" : ""}/installation?${new URLSearchParams({ host: host.trim() }).toString()}`);
  }

  return <div>
    <form onSubmit={submit} className="tool-form border-l-secure p-5 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-ink/55">{text.input}</span><input value={host} onChange={(event) => setHost(event.target.value)} placeholder={text.placeholder} className="h-14 w-full border border-line bg-white px-4 text-lg font-semibold text-night outline-none transition focus:border-secure focus:ring-4 focus:ring-secure/15" /></label>
        <button className="inline-flex h-14 items-center justify-center gap-2 bg-signal px-6 font-black text-white transition hover:bg-night"><ClipboardCheck size={18} />{text.submit}</button>
      </div>
      {inputError ? <p className="mt-3 text-sm font-bold text-fault">{inputError}</p> : null}
    </form>
    {!defaultHost ? null : error ? <div className="mt-6"><ErrorState locale={locale} message={error} /></div> : !result ? <div className="mt-6"><LoadingState locale={locale} label={text.loading} /></div> : <InstallationResult locale={locale} result={result} />}
  </div>;
}

function InstallationResult({ locale, result }: { locale: Locale; result: TlsInstallationResponse }) {
  const text = labels(locale);
  const tone = result.status === "valid" ? "border-secure bg-secure/10" : result.status === "needs-attention" ? "border-amber bg-amber/10" : "border-fault bg-fault/10";
  const statusText = result.status === "valid" ? (locale === "es" ? "Instalación correcta" : "Valid installation") : result.status === "needs-attention" ? (locale === "es" ? "Requiere revisión" : "Needs attention") : (locale === "es" ? "Problemas detectados" : "Problems detected");
  return <section className="mt-8">
    <div className={`border-l-4 p-5 sm:p-6 ${tone}`}><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><StatusIcon status={result.status} /><div><p className="text-xs font-black uppercase tracking-[0.16em] text-ink/55">{text.title}</p><h2 className="mt-1 font-serif text-3xl font-semibold text-night">{statusText}</h2><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-ink/70">{result.summary}</p></div></div><div className="text-right text-sm font-black text-night"><p>{result.host}:{result.port}</p><p className="mt-1 text-xs font-semibold text-ink/55">{new Date(result.assessedAt).toLocaleString(locale === "es" ? "es-ES" : "en-US")}</p></div></div></div>
    <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="report-section"><SectionTitle icon={<ShieldCheck size={20} />} title={text.checks} /><div className="mt-5 divide-y divide-line border-y border-line">{result.checks.map((check) => <CheckRow key={check.id} check={check} />)}</div></section>
      <section className="report-section"><SectionTitle icon={<Server size={20} />} title={text.certificate} /><dl className="mt-5 space-y-3"><Data label="Subject" value={result.certificate.subject} /><Data label={text.issuer} value={result.certificate.issuer} /><Data label={text.expires} value={`${result.certificate.validTo} (${result.daysRemaining} ${text.days.toLowerCase()})`} /><Data label={text.fingerprint} value={result.certificate.fingerprint256} mono /><Data label={text.chain} value={`${result.certificatesProvided} ${text.served.toLowerCase()}`} /></dl></section>
    </div>
    <section className="report-section mt-10"><SectionTitle icon={<Radar size={20} />} title={text.endpoints} /><p className="mt-3 text-sm font-semibold leading-6 text-ink/65">{result.endpointCoverage.scannedAddresses}/{result.endpointCoverage.totalAddresses} {text.scanned.toLowerCase()}. {result.endpointCoverage.consistent ? text.consistent : text.inconsistent}.</p><div className="mt-5 overflow-x-auto border-y border-line"><div className="min-w-[640px] divide-y divide-line">{result.endpointCoverage.endpoints.map((endpoint) => <div key={endpoint.address} className="grid grid-cols-[150px_110px_minmax(0,1fr)] gap-4 px-3 py-3 text-sm"><p className="font-black text-night">{endpoint.address}</p><p className={`font-black ${endpoint.status === "complete" ? "text-secure" : "text-fault"}`}>{endpoint.status === "complete" ? text.checked : text.unavailable}</p><p className="break-all font-mono text-xs font-semibold leading-5 text-ink/65">{endpoint.status === "complete" ? endpoint.fingerprint256 : endpoint.error}</p></div>)}</div></div></section>
  </section>;
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) { return <div className="flex items-center gap-3 text-night"><span className="text-signal">{icon}</span><h2 className="text-sm font-black uppercase tracking-[0.16em]">{title}</h2></div>; }
function StatusIcon({ status }: { status: TlsInstallationResponse["status"] }) { return status === "valid" ? <CheckCircle2 size={25} className="mt-1 text-secure" /> : status === "needs-attention" ? <CircleAlert size={25} className="mt-1 text-amber" /> : <CircleX size={25} className="mt-1 text-fault" />; }
function CheckRow({ check }: { check: TlsInstallationCheck }) { const color = check.status === "pass" ? "text-secure" : check.status === "warning" ? "text-amber" : "text-fault"; return <div className="flex gap-3 px-1 py-4 first:pt-4"><StatusIcon status={check.status === "pass" ? "valid" : check.status === "warning" ? "needs-attention" : "invalid"} /><div><h3 className={`font-black ${color}`}>{check.title}</h3><p className="mt-1 text-sm font-semibold leading-6 text-ink/65">{check.detail}</p></div></div>; }
function Data({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="grid gap-1 border-t border-line pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-4"><dt className="text-xs font-black uppercase tracking-[0.12em] text-ink/45">{label}</dt><dd className={`break-words text-sm font-semibold leading-6 text-ink/75 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>; }
