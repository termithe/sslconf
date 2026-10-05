"use client";

import { AlertTriangle, CheckCircle2, Copy, Download, Info, Link2, RotateCcw, ShieldAlert, ShieldCheck, type LucideIcon } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { copy, type Locale } from "@/lib/i18n";
import type { TlsRecommendation, TlsRedirectCheck, TlsScanFinding, TlsScanResponse } from "@/lib/types";

const findingStyles = {
  pass: { icon: CheckCircle2, className: "border-secure/25 bg-secure/8 text-secure" },
  info: { icon: Info, className: "border-signal/25 bg-signal/8 text-signal" },
  warning: { icon: AlertTriangle, className: "border-warn/30 bg-warn/10 text-warn" },
  fail: { icon: ShieldAlert, className: "border-fault/25 bg-fault/8 text-fault" }
} as const;

const recommendationStyles = {
  critical: "border-fault/30 bg-fault/10 text-fault",
  high: "border-fault/25 bg-fault/8 text-fault",
  medium: "border-warn/30 bg-warn/10 text-warn",
  low: "border-signal/25 bg-signal/8 text-signal",
  info: "border-line bg-white/75 text-ink/55"
} as const;

export function TLSServerScanResult({ result, locale = "en" }: { result: TlsScanResponse; locale?: Locale }) {
  const text = copy[locale];
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const profiles = configurationProfiles(result);
  const groupedRecommendations = groupRecommendations(result.recommendations);
  const actionableRecommendations = sortRecommendationsBySeverity(result.recommendations.filter((recommendation) => recommendation.severity !== "info"));
  const improveSteps = actionableRecommendations.slice(0, 5);
  const gradePanelClass = ["A+", "A"].includes(result.grade)
    ? "bg-secure text-white"
    : ["B", "C"].includes(result.grade)
      ? "bg-warn text-night"
      : "bg-fault text-white";

  return (
    <section className="space-y-6">
      <div className="report-masthead overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
          <div className={`${gradePanelClass} p-7`}>
            <p className={`text-xs font-black uppercase tracking-[0.18em] ${["B", "C"].includes(result.grade) ? "text-night/65" : "text-white/75"}`}>{text.scanResultTitle}</p>
            <div className="mt-5 flex items-end gap-4">
              <span className="text-7xl font-black leading-none">{result.grade}</span>
              <span className={`pb-2 text-sm font-black uppercase tracking-[0.16em] ${["B", "C"].includes(result.grade) ? "text-night/55" : "text-white/55"}`}>{result.score}/100</span>
            </div>
            <p className={`mt-4 text-sm font-bold leading-6 ${["B", "C"].includes(result.grade) ? "text-night/70" : "text-white/70"}`}>{result.summary}</p>
          </div>
          <div className="grid gap-y-5 p-5 sm:grid-cols-2 xl:grid-cols-3">
            <Metric label="Host" value={`${result.host}:${result.port}`} />
            <Metric label={text.scanScore} value={`${result.score}/100`} />
            <Metric label={text.scanAssessedAt} value={new Date(result.assessedAt).toLocaleString(locale === "es" ? "es-ES" : "en-US")} />
            <Metric label={text.scanChain} value={result.chain.verified ? text.scanTrusted : text.scanNotTrusted} />
            <Metric label="IPs" value={result.ipAddresses.join(", ") || "-"} />
            <Metric label={text.scanAlpn} value={result.alpn.join(", ") || "-"} />
          </div>
        </div>
      </div>

      <div className="report-actions p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton onClick={() => copyText(serverReportText(result, locale), "report", setCopiedAction)} active={copiedAction === "report"} icon={Copy} label={copiedAction === "report" ? text.copied : text.copyReport} />
          <ActionButton onClick={() => copyText(fixesText(result, locale), "fixes", setCopiedAction)} active={copiedAction === "fixes"} icon={Copy} label={copiedAction === "fixes" ? text.copied : text.copyAllFixes} />
          <ActionButton onClick={() => downloadText(`${result.host}-sslconf-report.json`, JSON.stringify(result, null, 2), "application/json")} icon={Download} label={text.downloadJson} />
          <ActionButton onClick={() => downloadText(`${result.host}-sslconf-report.html`, printableHtmlReport(result, locale), "text/html")} icon={Download} label={text.downloadHtml} />
          <ActionButton onClick={() => copyText(window.location.href, "link", setCopiedAction)} active={copiedAction === "link"} icon={Link2} label={copiedAction === "link" ? text.copied : text.copyLink} />
          <a href={locale === "es" ? "/es/scan" : "/scan"} className="inline-flex h-10 items-center gap-2 border border-line bg-white px-4 text-sm font-black text-night transition hover:border-signal hover:text-signal">
            <RotateCcw size={16} />
            {text.scanAnother}
          </a>
        </div>
      </div>

      <Panel title={text.scanConfigProfiles}>
        <div className="rounded-md border border-signal/20 bg-signal/8 p-4 text-sm font-bold leading-6 text-ink/70">
          {text.scanConfigNote}
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {profiles.map((profile) => (
            <div key={profile.id} className="overflow-hidden rounded-md border border-line bg-night text-white">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <h3 className="text-sm font-black uppercase tracking-[0.14em] text-mint/75">{profile.title}</h3>
                <ActionButton
                  onClick={() => copyText(profile.body, `profile-${profile.id}`, setCopiedAction)}
                  active={copiedAction === `profile-${profile.id}`}
                  icon={Copy}
                  label={copiedAction === `profile-${profile.id}` ? text.copied : profile.id === "nginx" ? text.scanCopyNginx : text.scanCopyApache}
                  tone="dark"
                />
              </div>
              <pre className="mono-scroll max-h-[520px] overflow-auto whitespace-pre-wrap break-words p-4 text-xs font-bold leading-6 text-white/82">{profile.body}</pre>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={text.scanWhyGrade}>
        <div className="grid gap-4 lg:grid-cols-[220px_1fr_220px]">
          <ScoreBox label={text.scanBaseScore} value={String(result.gradeBreakdown.baseScore)} />
          <div className="space-y-3">
            {result.gradeBreakdown.items.length > 0 ? (
              result.gradeBreakdown.items.map((item) => (
                <div key={`${item.label}-${item.points}`} className="rounded-md border border-line bg-white/75 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-black text-night">{item.label}</h3>
                    <span className="rounded-md bg-fault/10 px-2 py-1 text-sm font-black text-fault">{item.points}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-ink/65">{item.detail}</p>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-secure/25 bg-secure/8 p-4 text-sm font-bold leading-6 text-ink/70">
                {text.scanNoPenalties}
              </div>
            )}
          </div>
          <ScoreBox label={text.scanFinalScore} value={String(result.gradeBreakdown.finalScore)} strong />
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-5">
          <Panel title={text.scanImproveGrade}>
            {result.grade === "A+" && actionableRecommendations.length === 0 ? (
              <div className="rounded-md border border-secure/25 bg-secure/8 p-4 text-sm font-bold leading-6 text-ink/70">
                {text.scanAlreadyAPlus}
              </div>
            ) : improveSteps.length ? (
              <div className="space-y-3">
                <p className="text-sm font-bold leading-6 text-ink/65">{text.scanReachAPlus}</p>
                <div className="space-y-3">
                  {improveSteps.map((recommendation, index) => (
                    <div key={`${recommendation.severity}-${recommendation.title}-improve`} className="rounded-md border border-line bg-white/75 p-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex size-8 items-center justify-center rounded-md bg-night text-sm font-black text-white">{index + 1}</span>
                        <h3 className="min-w-0 flex-1 text-base font-black text-night">{recommendation.title}</h3>
                        <SeverityBadge severity={recommendation.severity} locale={locale} />
                      </div>
                      <p className="mt-3 text-sm font-bold leading-6 text-ink/70">{recommendation.action}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-signal/25 bg-signal/8 p-4 text-sm font-bold leading-6 text-ink/70">
                {text.scanNoActionableFixes}
              </div>
            )}
          </Panel>

          <Panel title={text.scanRecommendations}>
            {result.recommendations.length > 0 ? (
              <div className="space-y-5">
                {groupedRecommendations.map((group) => (
                  <div key={group.severity} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-black uppercase tracking-[0.16em] text-ink/50">{severityLabel(group.severity, locale)}</h3>
                      <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-black text-ink/50">{group.items.length}</span>
                    </div>
                    <div className="space-y-4">
                      {group.items.map((recommendation) => <RecommendationCard key={`${recommendation.severity}-${recommendation.title}`} recommendation={recommendation} locale={locale} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-secure/25 bg-secure/8 p-4 text-sm font-bold leading-6 text-ink/70">
                {text.scanNoRecommendations}
              </div>
            )}
          </Panel>

          <Panel title={text.scanFindings}>
            <div className="space-y-3">
              {result.findings.map((finding) => <FindingRow key={`${finding.level}-${finding.title}`} finding={finding} />)}
            </div>
          </Panel>

          <Panel title={text.scanProtocols}>
            <div className="grid gap-3 md:grid-cols-2">
              {result.protocols.map((protocol) => (
                <div key={protocol.name} className="rounded-md border border-line bg-white/75 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-black text-night">{protocol.name}</h3>
                    <span className={`rounded-md px-2 py-1 text-xs font-black uppercase ${protocol.supported ? "bg-secure/10 text-secure" : "bg-ink/8 text-ink/45"}`}>
                      {protocol.supported ? text.supported : text.notSupported}
                    </span>
                  </div>
                  <p className="mt-3 break-words text-sm font-bold leading-6 text-ink/65">{protocol.supported ? protocol.cipher ?? protocol.protocol ?? "-" : protocolErrorSummary(protocol.error, locale)}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={text.scanProtocolDetails}>
            <div className="grid gap-3 md:grid-cols-2">
              <AdvancedSignal title={text.scanCompression} status={result.protocolDetails.compression.status} level={result.protocolDetails.compression.status === "supported" ? "bad" : result.protocolDetails.compression.status === "unknown" ? "warn" : "good"} value={result.protocolDetails.compression.detail} />
              <AdvancedSignal title={text.scanClientRenegotiation} status={result.protocolDetails.clientRenegotiation.status} level={result.protocolDetails.clientRenegotiation.status === "supported" ? "warn" : result.protocolDetails.clientRenegotiation.status === "unknown" ? "info" : "good"} value={result.protocolDetails.clientRenegotiation.detail} />
              <AdvancedSignal title={text.scanSecureRenegotiation} status={result.protocolDetails.secureRenegotiation.status} level={result.protocolDetails.secureRenegotiation.status === "insecure" ? "bad" : result.protocolDetails.secureRenegotiation.status === "secure" ? "good" : "info"} value={result.protocolDetails.secureRenegotiation.detail} />
              <AdvancedSignal title={text.scanFallbackScsv} status={result.protocolDetails.fallbackScsv.status} level={result.protocolDetails.fallbackScsv.status === "supported" ? "good" : result.protocolDetails.fallbackScsv.status === "not-supported" ? "warn" : "info"} value={result.protocolDetails.fallbackScsv.detail} />
              <AdvancedSignal title={text.scanSessionResumption} status={result.protocolDetails.sessionResumption.status} level={result.protocolDetails.sessionResumption.status === "supported" ? "good" : "info"} value={result.protocolDetails.sessionResumption.detail} />
              <AdvancedSignal
                title={text.scanKeyExchange}
                status={result.protocolDetails.keyExchange.status}
                level={result.protocolDetails.keyExchange.status === "weak" ? "bad" : result.protocolDetails.keyExchange.status === "modern" ? "good" : "warn"}
                value={[
                  result.protocolDetails.keyExchange.type,
                  result.protocolDetails.keyExchange.name,
                  result.protocolDetails.keyExchange.size ? `${result.protocolDetails.keyExchange.size} bits` : "",
                  result.protocolDetails.keyExchange.detail
                ].filter(Boolean).join("\n")}
              />
            </div>
          </Panel>

          <Panel title={text.scanTls12Ciphers}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label={text.scanPreferredCipher} value={result.tls12Ciphers.preferredCipher ?? "-"} />
              <Metric label={text.scanServerOrder} value={result.tls12Ciphers.serverOrder} />
            </div>
            <div className="mt-4 overflow-hidden rounded-md border border-line bg-white/70">
              <div className="grid grid-cols-[minmax(0,1fr)_120px] border-b border-line bg-mint/60 px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-ink/50">
                <span>{text.scanCipherSuite}</span>
                <span>{text.scanCipherProperties}</span>
              </div>
              <div className="divide-y divide-line">
                {result.tls12Ciphers.supported.length ? result.tls12Ciphers.supported.map((cipher) => (
                  <div key={cipher.name} className="grid grid-cols-[minmax(0,1fr)_120px] gap-3 px-4 py-3">
                    <div>
                      <p className="break-words text-sm font-black leading-6 text-night">{cipher.name}</p>
                      <p className="mt-1 text-xs font-bold text-ink/55">{cipher.keyExchange} / {cipher.authentication} / {cipher.encryption} / {cipher.bits}</p>
                    </div>
                    <div className="flex flex-col items-start gap-2">
                      <span className={`rounded-md px-2 py-1 text-xs font-black uppercase ${cipher.weak ? "bg-fault/10 text-fault" : "bg-secure/10 text-secure"}`}>
                        {cipher.weak ? text.scanWeak : text.scanStrong}
                      </span>
                      <span className="text-xs font-bold text-ink/55">{cipher.forwardSecrecy ? "FS" : "no FS"} / {cipher.aead ? "AEAD" : "CBC"}</span>
                    </div>
                  </div>
                )) : (
                  <div className="px-4 py-4 text-sm font-bold leading-6 text-ink/60">-</div>
                )}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title={text.scanCertificate}>
            <div className="space-y-3 text-sm font-bold leading-6 text-ink/70">
              <KeyValue label="Subject" value={result.certificate.subject} />
              <KeyValue label={text.issuer} value={result.certificate.issuer} />
              <KeyValue label={text.validity} value={`${result.certificate.validFrom} - ${result.certificate.validTo}`} />
              <KeyValue label="SHA256" value={result.certificate.fingerprint256} />
              <KeyValue label="Key" value={[result.certificate.keyType, result.certificate.keyBits ? `${result.certificate.keyBits} bits` : ""].filter(Boolean).join(" ")} />
            </div>
          </Panel>

          <Panel title={text.scanExtras}>
            <div className="space-y-4">
              <Signal title={text.scanHsts} good={result.hsts.present} value={result.hsts.header ?? "-"} />
              <Signal title={text.scanHstsPreload} good={result.hstsPreload.status === "preloaded"} value={hstsPreloadValue(result.hstsPreload, locale)} />
              <Signal title={text.scanOcspStapling} good={result.ocspStapling.present} value={ocspStaplingValue(result.ocspStapling, locale)} />
              <Signal title={text.scanOcspRevocation} good={result.ocspRevocation.status === "good"} value={ocspRevocationValue(result.ocspRevocation, locale)} />
              <Signal title={text.scanHttp2} good={result.http2.supported} value={http2Value(result.http2, locale)} />
              <Signal title={text.scanCaa} good={result.caa.present} value={result.caa.records.join("\n") || "-"} />
            </div>
          </Panel>

          <Panel title={text.scanRedirects}>
            <div className="space-y-4">
              <RedirectFlow title={text.scanHttpFlow} check={result.redirects.http} locale={locale} />
              <RedirectFlow title={text.scanHttpsFlow} check={result.redirects.https} locale={locale} />
              {result.redirects.canonicalHost ? <KeyValue label="Canonical host" value={result.redirects.canonicalHost} /> : null}
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}

function ActionButton({ onClick, icon: Icon, label, active = false, tone = "light" }: { onClick: () => void; icon: LucideIcon; label: string; active?: boolean; tone?: "light" | "dark" }) {
  const idleClass = tone === "dark"
    ? "border border-white/15 bg-white/8 text-white hover:border-mint/45 hover:text-mint"
    : "border border-line bg-white text-night hover:border-signal hover:text-signal";
  return (
    <button onClick={onClick} className={`inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-black transition ${active ? "bg-secure text-white" : idleClass}`}>
      <Icon size={16} />
      {label}
    </button>
  );
}

async function copyText(value: string, action: string, setCopiedAction: (action: string | null) => void) {
  await navigator.clipboard.writeText(value);
  setCopiedAction(action);
  window.setTimeout(() => setCopiedAction(null), 1600);
}

function downloadText(filename: string, value: string, type: string) {
  const blob = new Blob([value], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.replace(/[^a-z0-9_.-]/gi, "_");
  link.click();
  URL.revokeObjectURL(url);
}

function serverReportText(result: TlsScanResponse, locale: Locale) {
  const lines = [
    `SSLConf Server Report`,
    `Host: ${result.host}:${result.port}`,
    `Grade: ${result.grade}`,
    `Score: ${result.score}/100`,
    `Assessed at: ${result.assessedAt}`,
    `Certificate: ${result.certificate.subject}`,
    `Issuer: ${result.certificate.issuer}`,
    `Valid: ${result.certificate.validFrom} - ${result.certificate.validTo}`,
    `Chain: ${result.chain.verified ? "trusted" : "not trusted"}`,
    "",
    locale === "es" ? "Penalizaciones:" : "Penalties:",
    ...(result.gradeBreakdown.items.length ? result.gradeBreakdown.items.map((item) => `${item.points} ${item.label}: ${item.detail}`) : [locale === "es" ? "Sin penalizaciones." : "No penalties."]),
    "",
    locale === "es" ? "Hallazgos:" : "Findings:",
    ...result.findings.map((finding) => `[${finding.level}] ${finding.title}: ${finding.detail}`),
    "",
    locale === "es" ? "Recomendaciones:" : "Recommendations:",
    ...(result.recommendations.length ? result.recommendations.map((recommendation) => `[${recommendation.severity}] ${recommendation.title}: ${recommendation.action}`) : [locale === "es" ? "Sin recomendaciones." : "No recommendations."])
  ];
  return lines.join("\n");
}

function fixesText(result: TlsScanResponse, locale: Locale) {
  const actionable = sortRecommendationsBySeverity(result.recommendations.filter((recommendation) => recommendation.severity !== "info"));
  const recommendations = actionable.length ? actionable : sortRecommendationsBySeverity(result.recommendations);
  const emptyText = locale === "es" ? "No hay fixes accionables para este resultado." : "No actionable fixes for this result.";
  if (!recommendations.length) return emptyText;

  const lines = [
    "SSLConf Fixes",
    `Host: ${result.host}:${result.port}`,
    `Grade: ${result.grade}`,
    `Score: ${result.score}/100`,
    ""
  ];

  for (const recommendation of recommendations) {
    lines.push(`[${severityLabel(recommendation.severity, locale)}] ${recommendation.title}`);
    lines.push(`${locale === "es" ? "Acción" : "Action"}: ${recommendation.action}`);
    if (recommendation.config?.length) {
      for (const snippet of recommendation.config) {
        lines.push("");
        lines.push(`${snippet.label}:`);
        lines.push(snippet.value);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function printableHtmlReport(result: TlsScanResponse, locale: Locale) {
  const text = copy[locale];
  const recommendations = sortRecommendationsBySeverity(result.recommendations);
  const actionable = recommendations.filter((recommendation) => recommendation.severity !== "info");
  const protocols = result.protocols.map((protocol) => `
    <tr>
      <td>${escapeHtml(protocol.name)}</td>
      <td><span class="pill ${protocol.supported ? "ok" : "muted"}">${escapeHtml(protocol.supported ? text.supported : text.notSupported)}</span></td>
      <td>${escapeHtml(protocol.supported ? protocol.cipher ?? protocol.protocol ?? "-" : protocolErrorSummary(protocol.error, locale))}</td>
    </tr>
  `).join("");
  const cipherRows = result.tls12Ciphers.supported.map((cipher) => `
    <tr>
      <td>${escapeHtml(cipher.name)}</td>
      <td>${escapeHtml(cipher.keyExchange)} / ${escapeHtml(cipher.authentication)} / ${escapeHtml(cipher.encryption)}</td>
      <td>${cipher.bits}</td>
      <td>${cipher.forwardSecrecy ? "FS" : "no FS"} / ${cipher.aead ? "AEAD" : "CBC"}</td>
      <td><span class="pill ${cipher.weak ? "bad" : "ok"}">${escapeHtml(cipher.weak ? text.scanWeak : text.scanStrong)}</span></td>
    </tr>
  `).join("");
  const penaltyRows = result.gradeBreakdown.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.label)}</td>
      <td>${escapeHtml(item.detail)}</td>
      <td class="points">${escapeHtml(String(item.points))}</td>
    </tr>
  `).join("");
  const recommendationRows = recommendations.map((recommendation) => `
    <article class="recommendation">
      <div>
        <span class="pill ${recommendation.severity}">${escapeHtml(severityLabel(recommendation.severity, locale))}</span>
        <h3>${escapeHtml(recommendation.title)}</h3>
      </div>
      <p><strong>${escapeHtml(text.scanImpact)}:</strong> ${escapeHtml(recommendation.impact)}</p>
      <p><strong>${escapeHtml(text.scanAction)}:</strong> ${escapeHtml(recommendation.action)}</p>
      ${recommendation.config?.length ? recommendation.config.map((snippet) => `
        <div class="snippet">
          <strong>${escapeHtml(snippet.label)}</strong>
          <pre>${escapeHtml(snippet.value)}</pre>
        </div>
      `).join("") : ""}
    </article>
  `).join("");
  const findings = result.findings.map((finding) => `
    <li><span class="pill ${finding.level}">${escapeHtml(finding.level)}</span><strong>${escapeHtml(finding.title)}</strong><br>${escapeHtml(finding.detail)}</li>
  `).join("");
  const gradeClass = ["A+", "A"].includes(result.grade) ? "grade-ok" : ["B", "C"].includes(result.grade) ? "grade-warn" : "grade-bad";

  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SSLConf report - ${escapeHtml(result.host)}</title>
  <style>
    :root { color-scheme: light; --ink: #17212b; --muted: #5b6875; --line: #d9e2ea; --soft: #f5f8fb; --ok: #12805c; --warn: #b7791f; --bad: #c24132; --blue: #125e8a; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #edf3f7; color: var(--ink); font: 14px/1.55 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 1040px; margin: 0 auto; padding: 32px 18px; }
    header { display: grid; grid-template-columns: 220px 1fr; overflow: hidden; border: 1px solid var(--line); border-radius: 10px; background: white; }
    .grade { padding: 28px; color: white; }
    .grade-ok { background: var(--ok); }
    .grade-warn { background: var(--warn); color: #1d1607; }
    .grade-bad { background: var(--bad); }
    .grade-label { margin: 0 0 12px; font-size: 11px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; opacity: .75; }
    .grade-value { margin: 0; font-size: 64px; line-height: 1; font-weight: 900; }
    .summary { padding: 26px; }
    .summary h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.15; }
    .summary p { margin: 0; color: var(--muted); font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
    .card, section { margin-top: 18px; border: 1px solid var(--line); border-radius: 10px; background: white; padding: 18px; break-inside: avoid; }
    .card span { display: block; color: var(--muted); font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
    .card strong { display: block; margin-top: 5px; overflow-wrap: anywhere; font-size: 16px; }
    h2 { margin: 0 0 12px; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
    h3 { margin: 8px 0; font-size: 17px; }
    table { width: 100%; border-collapse: collapse; overflow-wrap: anywhere; }
    th, td { border-top: 1px solid var(--line); padding: 9px 8px; text-align: left; vertical-align: top; }
    th { color: var(--muted); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 10px 0; }
    .pill { display: inline-block; border-radius: 6px; padding: 2px 7px; font-size: 11px; font-weight: 900; text-transform: uppercase; }
    .ok, .pass { background: #e5f6ef; color: var(--ok); }
    .bad, .fail, .critical, .high { background: #fdecea; color: var(--bad); }
    .warn, .warning, .medium { background: #fff4d8; color: var(--warn); }
    .low, .info { background: #e8f3ff; color: var(--blue); }
    .muted { background: #eef2f5; color: var(--muted); }
    .points { color: var(--bad); font-weight: 900; white-space: nowrap; }
    .recommendation { border-top: 1px solid var(--line); padding: 14px 0; break-inside: avoid; }
    .recommendation:first-of-type { border-top: 0; padding-top: 0; }
    .snippet { margin-top: 10px; border: 1px solid var(--line); border-radius: 8px; background: #101923; color: white; padding: 12px; }
    pre { margin: 8px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    footer { margin-top: 18px; color: var(--muted); font-size: 12px; text-align: center; }
    @media print {
      body { background: white; }
      main { max-width: none; padding: 0; }
      header, .card, section { border-color: #cfd7df; box-shadow: none; }
      a { color: inherit; text-decoration: none; }
    }
    @media (max-width: 760px) {
      header, .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div class="grade ${gradeClass}">
        <p class="grade-label">${escapeHtml(text.scanResultTitle)}</p>
        <p class="grade-value">${escapeHtml(result.grade)}</p>
        <p>${result.score}/100</p>
      </div>
      <div class="summary">
        <h1>SSLConf ${escapeHtml(text.scanResultTitle)}: ${escapeHtml(result.host)}</h1>
        <p>${escapeHtml(result.summary)}</p>
        <div class="grid">
          ${htmlMetric("Host", `${result.host}:${result.port}`)}
          ${htmlMetric(text.scanAssessedAt, new Date(result.assessedAt).toLocaleString(locale === "es" ? "es-ES" : "en-US"))}
          ${htmlMetric(text.scanChain, result.chain.verified ? text.scanTrusted : text.scanNotTrusted)}
          ${htmlMetric("IPs", result.ipAddresses.join(", ") || "-")}
          ${htmlMetric(text.scanAlpn, result.alpn.join(", ") || "-")}
          ${htmlMetric(text.scanServerOrder, result.tls12Ciphers.serverOrder)}
        </div>
      </div>
    </header>

    <section>
      <h2>${escapeHtml(text.scanImproveGrade)}</h2>
      ${actionable.length ? `<ol>${actionable.slice(0, 6).map((recommendation) => `<li><strong>${escapeHtml(recommendation.title)}</strong> <span class="pill ${recommendation.severity}">${escapeHtml(severityLabel(recommendation.severity, locale))}</span><br>${escapeHtml(recommendation.action)}</li>`).join("")}</ol>` : `<p>${escapeHtml(text.scanAlreadyAPlus)}</p>`}
    </section>

    <section>
      <h2>${escapeHtml(text.scanWhyGrade)}</h2>
      <table>
        <thead><tr><th>${escapeHtml(text.scanAction)}</th><th>${escapeHtml(text.scanImpact)}</th><th>${escapeHtml(text.scanScore)}</th></tr></thead>
        <tbody>${penaltyRows || `<tr><td colspan="3">${escapeHtml(text.scanNoPenalties)}</td></tr>`}</tbody>
      </table>
    </section>

    <section>
      <h2>${escapeHtml(text.scanCertificate)}</h2>
      <table><tbody>
        <tr><th>Subject</th><td>${escapeHtml(result.certificate.subject)}</td></tr>
        <tr><th>${escapeHtml(text.issuer)}</th><td>${escapeHtml(result.certificate.issuer)}</td></tr>
        <tr><th>${escapeHtml(text.validity)}</th><td>${escapeHtml(result.certificate.validFrom)} - ${escapeHtml(result.certificate.validTo)}</td></tr>
        <tr><th>SHA256</th><td>${escapeHtml(result.certificate.fingerprint256)}</td></tr>
        <tr><th>Key</th><td>${escapeHtml([result.certificate.keyType, result.certificate.keyBits ? `${result.certificate.keyBits} bits` : ""].filter(Boolean).join(" ") || "-")}</td></tr>
      </tbody></table>
    </section>

    <section>
      <h2>${escapeHtml(text.scanProtocols)}</h2>
      <table><thead><tr><th>Protocol</th><th>Status</th><th>Cipher / detail</th></tr></thead><tbody>${protocols}</tbody></table>
    </section>

    <section>
      <h2>${escapeHtml(text.scanExtras)}</h2>
      <div class="grid">
        ${htmlMetric(text.scanHsts, result.hsts.header ?? "-")}
        ${htmlMetric(text.scanHstsPreload, hstsPreloadValue(result.hstsPreload, locale))}
        ${htmlMetric(text.scanOcspStapling, ocspStaplingValue(result.ocspStapling, locale))}
        ${htmlMetric(text.scanOcspRevocation, ocspRevocationValue(result.ocspRevocation, locale))}
        ${htmlMetric(text.scanHttp2, http2Value(result.http2, locale))}
        ${htmlMetric(text.scanCaa, result.caa.records.join("\\n") || "-")}
      </div>
    </section>

    <section>
      <h2>${escapeHtml(text.scanFindings)}</h2>
      <ul>${findings}</ul>
    </section>

    <section>
      <h2>${escapeHtml(text.scanRecommendations)}</h2>
      ${recommendationRows || `<p>${escapeHtml(text.scanNoRecommendations)}</p>`}
    </section>

    <section>
      <h2>${escapeHtml(text.scanTls12Ciphers)}</h2>
      <table><thead><tr><th>${escapeHtml(text.scanCipherSuite)}</th><th>${escapeHtml(text.scanCipherProperties)}</th><th>Bits</th><th>FS / AEAD</th><th>Status</th></tr></thead><tbody>${cipherRows || `<tr><td colspan="5">-</td></tr>`}</tbody></table>
    </section>

    <footer>Generated by SSLConf on ${escapeHtml(new Date().toISOString())}</footer>
  </main>
</body>
</html>`;
}

function htmlMetric(label: string, value: string) {
  return `<div class="card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const severityOrder: TlsRecommendation["severity"][] = ["critical", "high", "medium", "low", "info"];

function groupRecommendations(recommendations: TlsRecommendation[]) {
  return severityOrder
    .map((severity) => ({
      severity,
      items: recommendations.filter((recommendation) => recommendation.severity === severity)
    }))
    .filter((group) => group.items.length > 0);
}

function sortRecommendationsBySeverity(recommendations: TlsRecommendation[]) {
  const severityRank = new Map(severityOrder.map((severity, index) => [severity, index]));
  return [...recommendations].sort((left, right) => (severityRank.get(left.severity) ?? 99) - (severityRank.get(right.severity) ?? 99));
}

function severityLabel(severity: TlsRecommendation["severity"], locale: Locale) {
  const text = copy[locale];
  const labels = {
    critical: text.scanSeverityCritical,
    high: text.scanSeverityHigh,
    medium: text.scanSeverityMedium,
    low: text.scanSeverityLow,
    info: text.scanSeverityInfo
  };
  return labels[severity];
}

function configurationProfiles(result: TlsScanResponse) {
  const host = result.redirects.canonicalHost ?? result.host;
  const aliases = Array.from(new Set([result.host, result.redirects.canonicalHost].filter(Boolean) as string[]));
  const serverNames = Array.from(new Set([host, ...aliases])).join(" ");
  const apacheAlias = aliases.filter((alias) => alias !== host);
  const hstsHeader = "max-age=63072000; includeSubDomains; preload";
  const ocspLinesNginx = result.ocspStapling.present
    ? ["ssl_stapling on;", "ssl_stapling_verify on;"]
    : ["ssl_stapling on;", "ssl_stapling_verify on;", "resolver 1.1.1.1 8.8.8.8 valid=300s;"];
  const ocspLinesApache = result.ocspStapling.present
    ? ["SSLUseStapling On"]
    : ["SSLUseStapling On", "SSLStaplingCache shmcb:/var/run/ocsp(128000)"];

  const nginx = [
    "# SSLConf baseline. Review paths and vhost layout before applying.",
    "server {",
    "  listen 80;",
    `  server_name ${serverNames};`,
    "  return 301 https://$host$request_uri;",
    "}",
    "",
    "server {",
    "  listen 443 ssl http2;",
    `  server_name ${serverNames};`,
    "",
    `  ssl_certificate /etc/ssl/certs/${host}.fullchain.pem;`,
    `  ssl_certificate_key /etc/ssl/private/${host}.key;`,
    "",
    "  ssl_protocols TLSv1.2 TLSv1.3;",
    "  ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305';",
    "  ssl_prefer_server_ciphers on;",
    "",
    ...ocspLinesNginx.map((line) => `  ${line}`),
    "",
    `  add_header Strict-Transport-Security "${hstsHeader}" always;`,
    "}"
  ].join("\n");

  const apache = [
    "# SSLConf baseline. Review paths and vhost layout before applying.",
    "<VirtualHost *:80>",
    `  ServerName ${host}`,
    ...apacheAlias.map((alias) => `  ServerAlias ${alias}`),
    `  Redirect permanent / https://${host}/`,
    "</VirtualHost>",
    "",
    "<VirtualHost *:443>",
    `  ServerName ${host}`,
    ...apacheAlias.map((alias) => `  ServerAlias ${alias}`),
    "",
    "  SSLEngine on",
    `  SSLCertificateFile /etc/ssl/certs/${host}.crt`,
    `  SSLCertificateKeyFile /etc/ssl/private/${host}.key`,
    `  SSLCertificateChainFile /etc/ssl/certs/${host}.ca-bundle.crt`,
    "",
    "  SSLProtocol -all +TLSv1.2 +TLSv1.3",
    "  SSLCipherSuite ECDHE+AESGCM:ECDHE+CHACHA20",
    "  SSLHonorCipherOrder On",
    "",
    "  Protocols h2 http/1.1",
    "",
    ...ocspLinesApache.map((line) => `  ${line}`),
    "",
    `  Header always set Strict-Transport-Security "${hstsHeader}"`,
    "</VirtualHost>"
  ].join("\n");

  return [
    { id: "nginx", title: "nginx", body: nginx },
    { id: "apache", title: "Apache", body: apache }
  ];
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="report-section">
      <h2 className="text-sm font-black uppercase tracking-[0.16em] text-ink/55">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RecommendationCard({ recommendation, locale }: { recommendation: TlsRecommendation; locale: Locale }) {
  const text = copy[locale];
  return (
    <div className="rounded-md border border-line bg-white/80 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-black text-night">{recommendation.title}</h3>
        <SeverityBadge severity={recommendation.severity} locale={locale} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <RecommendationText label={text.scanImpact} value={recommendation.impact} />
        <RecommendationText label={text.scanAction} value={recommendation.action} />
      </div>
      {recommendation.config?.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {recommendation.config.map((snippet) => (
            <div key={`${recommendation.title}-${snippet.label}`} className="rounded-md border border-line bg-night p-4 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-mint/70">{snippet.label}</p>
              <pre className="mono-scroll mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs font-bold leading-5 text-white/85">{snippet.value}</pre>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SeverityBadge({ severity, locale }: { severity: TlsRecommendation["severity"]; locale: Locale }) {
  return (
    <span className={`rounded-md border px-2 py-1 text-xs font-black uppercase tracking-[0.1em] ${recommendationStyles[severity]}`}>
      {severityLabel(severity, locale)}
    </span>
  );
}

function RecommendationText({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white/60 p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-ink/70">{value}</p>
    </div>
  );
}

function ScoreBox({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`rounded-md border p-5 ${strong ? "border-secure/25 bg-secure/10" : "border-line bg-white/65"}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className={`mt-3 text-4xl font-black leading-none ${strong ? "text-secure" : "text-night"}`}>{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="data-cell min-w-0">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-2 break-words text-base font-semibold leading-6 text-night">{value}</p>
    </div>
  );
}

function FindingRow({ finding }: { finding: TlsScanFinding }) {
  const style = findingStyles[finding.level];
  const Icon = style.icon;
  return (
    <div className={`rounded-md border p-4 sm:p-5 ${style.className}`}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 shrink-0" size={18} />
        <div>
          <h3 className="text-base font-black text-night">{finding.title}</h3>
          <p className="mt-1 text-sm font-bold leading-7 text-ink/65">{finding.detail}</p>
        </div>
      </div>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md border border-line bg-white/60 p-3">
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p className="mt-2 break-words text-sm font-bold leading-6 text-night">{value || "-"}</p>
    </div>
  );
}

function Signal({ title, good, value }: { title: string; good: boolean; value: string }) {
  return (
    <div className="rounded-md border border-line bg-white/70 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        {good ? <ShieldCheck size={17} className="text-secure" /> : <AlertTriangle size={17} className="text-warn" />}
        <h3 className="font-black text-night">{title}</h3>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-ink/60">{value}</p>
    </div>
  );
}

function AdvancedSignal({ title, status, level, value }: { title: string; status: string; level: "good" | "info" | "warn" | "bad"; value?: string }) {
  const className = level === "bad"
    ? "border-fault/25 bg-fault/8 text-fault"
    : level === "warn"
      ? "border-warn/30 bg-warn/10 text-warn"
      : level === "good"
        ? "border-secure/25 bg-secure/8 text-secure"
        : "border-signal/25 bg-signal/8 text-signal";

  return (
    <div className={`rounded-md border p-4 sm:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-night">{title}</h3>
        <span className="rounded-md bg-white/70 px-2 py-1 text-xs font-black uppercase text-ink/60">{status}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-ink/65">{value || "-"}</p>
    </div>
  );
}

function ocspStaplingValue(ocsp: TlsScanResponse["ocspStapling"], locale: Locale) {
  if (ocsp.present) return ocsp.responseBytes ? `${ocsp.responseBytes} bytes` : locale === "es" ? "Presente" : "Present";
  if (ocsp.error) return ocsp.error;
  return locale === "es" ? "No entregado por el servidor" : "Not provided by the server";
}

function hstsPreloadValue(preload: TlsScanResponse["hstsPreload"], locale: Locale) {
  const labels = {
    preloaded: locale === "es" ? "Preloaded" : "Preloaded",
    pending: locale === "es" ? "Pendiente de alta" : "Pending",
    "pending-removal": locale === "es" ? "Pendiente de retirada" : "Pending removal",
    removed: locale === "es" ? "Retirado" : "Removed",
    unknown: locale === "es" ? "No incluido" : "Not listed",
    rejected: locale === "es" ? "Rechazado" : "Rejected",
    error: locale === "es" ? "No comprobado" : "Not checked"
  };
  return [
    labels[preload.status],
    preload.preloadedDomain ? `Preloaded domain: ${preload.preloadedDomain}` : "",
    preload.name ? `Name: ${preload.name}` : "",
    preload.domain ? `Domain: ${preload.domain}` : "",
    preload.bulk ? "Bulk preload" : "",
    preload.error
  ].filter(Boolean).join("\n");
}

function ocspRevocationValue(ocsp: TlsScanResponse["ocspRevocation"], locale: Locale) {
  const labels = {
    good: locale === "es" ? "Vigente" : "Good",
    revoked: locale === "es" ? "Revocado" : "Revoked",
    unknown: locale === "es" ? "Desconocido" : "Unknown",
    "not-supported": locale === "es" ? "Sin responder OCSP publicado" : "No OCSP responder published",
    error: locale === "es" ? "No comprobado" : "Not checked"
  };
  return [
    labels[ocsp.status],
    ocsp.responderUrl,
    ocsp.producedAt ? `Produced: ${new Date(ocsp.producedAt).toLocaleString(locale === "es" ? "es-ES" : "en-US")}` : "",
    ocsp.thisUpdate ? `This update: ${new Date(ocsp.thisUpdate).toLocaleString(locale === "es" ? "es-ES" : "en-US")}` : "",
    ocsp.nextUpdate ? `Next update: ${new Date(ocsp.nextUpdate).toLocaleString(locale === "es" ? "es-ES" : "en-US")}` : "",
    ocsp.revocationTime ? `Revoked at: ${new Date(ocsp.revocationTime).toLocaleString(locale === "es" ? "es-ES" : "en-US")}` : "",
    ocsp.error
  ].filter(Boolean).join("\n");
}

function http2Value(http2: TlsScanResponse["http2"], locale: Locale) {
  if (http2.supported) return http2.negotiatedProtocol ? `ALPN: ${http2.negotiatedProtocol}` : "h2";
  if (http2.negotiatedProtocol) return `ALPN: ${http2.negotiatedProtocol}`;
  return locale === "es" ? "No negociado por ALPN" : "Not negotiated via ALPN";
}

function RedirectFlow({ title, check, locale }: { title: string; check: TlsRedirectCheck; locale: Locale }) {
  const text = copy[locale];
  return (
    <div className="rounded-md border border-line bg-white/70 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-night">{title}</h3>
        <span className={`rounded-md px-2 py-1 text-xs font-black uppercase ${check.error ? "bg-warn/10 text-warn" : check.redirectsToHttps ? "bg-secure/10 text-secure" : "bg-ink/8 text-ink/45"}`}>
          {check.skipped ? text.scanSkipped : check.error ? "warning" : check.statusCode ?? "-"}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {check.skipped ? (
          <p className="text-sm font-bold leading-6 text-ink/60">{text.scanSkipped}</p>
        ) : check.hops.length ? (
          check.hops.map((hop, index) => (
            <div key={`${hop.url}-${index}`} className="rounded-md border border-line bg-white/70 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-night px-2 py-1 text-xs font-black text-white">{hop.statusCode ?? "-"}</span>
                <p className="min-w-0 flex-1 break-words text-xs font-bold leading-5 text-night">{hop.url}</p>
              </div>
              {hop.location ? <p className="mt-2 break-words text-xs font-bold leading-5 text-signal">-&gt; {hop.location}</p> : null}
              {hop.hsts ? <p className="mt-2 break-words text-xs font-bold leading-5 text-secure">HSTS: {hop.hsts}</p> : null}
            </div>
          ))
        ) : (
          <p className="text-sm font-bold leading-6 text-ink/60">{check.error ?? "-"}</p>
        )}
        {check.finalUrl ? <KeyValue label={text.scanFinalUrl} value={check.finalUrl} /> : null}
      </div>
    </div>
  );
}

function protocolErrorSummary(error: string | undefined, locale: Locale) {
  if (!error) return "-";
  if (/alert protocol version/i.test(error)) return locale === "es" ? "Rechazado por version de protocolo." : "Rejected by protocol version.";
  if (/handshake failure/i.test(error)) return locale === "es" ? "Handshake rechazado por el servidor." : "Handshake rejected by the server.";
  if (/unsupported protocol/i.test(error)) return locale === "es" ? "Protocolo no soportado." : "Protocol not supported.";
  if (/timeout/i.test(error)) return "Timeout.";
  return locale === "es" ? "No se pudo negociar esta version." : "Could not negotiate this version.";
}
