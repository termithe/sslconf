"use client";

import { Radar } from "lucide-react";
import { useEffect, useState } from "react";
import { copy, type Locale } from "@/lib/i18n";

const recentScanHostsKey = "sslconf_recent_scan_hosts";
const maxRecentScanHosts = 6;

export function TLSServerScanForm({ defaultHost = "", locale = "en" }: { defaultHost?: string; locale?: Locale }) {
  const [host, setHost] = useState(defaultHost);
  const [error, setError] = useState("");
  const [recentHosts, setRecentHosts] = useState<string[]>([]);
  const text = copy[locale];

  useEffect(() => {
    setRecentHosts(readRecentHosts());

    function onRecentHostsChanged() {
      setRecentHosts(readRecentHosts());
    }

    window.addEventListener("sslconf:recent-scans-changed", onRecentHostsChanged);
    return () => window.removeEventListener("sslconf:recent-scans-changed", onRecentHostsChanged);
  }, []);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!host.trim()) {
      setError(text.emptyHost);
      return;
    }
    setError("");
    const params = new URLSearchParams({ host: host.trim() });
    window.location.assign(`${locale === "es" ? "/es" : ""}/scan?${params.toString()}`);
  }

  function clearRecentHosts() {
    window.localStorage.removeItem(recentScanHostsKey);
    setRecentHosts([]);
  }

  return (
    <form onSubmit={onSubmit} className="tool-form border-l-secure p-5 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-ink/55">{text.scanFormLabel}</span>
          <input
            value={host}
            onChange={(event) => setHost(event.target.value)}
            placeholder={text.scanFormPlaceholder}
            className="h-14 w-full border border-line bg-white px-4 text-lg font-semibold text-night outline-none transition focus:border-secure focus:ring-4 focus:ring-secure/15"
          />
        </label>
        <button className="inline-flex h-14 items-center justify-center gap-2 bg-signal px-6 font-black text-white transition hover:bg-night">
          <Radar size={18} />
          {text.scanSubmit}
        </button>
      </div>
      {recentHosts.length ? (
        <div className="mt-4 border-t border-line pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-ink/45">{text.scanRecentTitle}</p>
            <button type="button" onClick={clearRecentHosts} className="text-xs font-black text-ink/50 transition hover:text-fault">
              {text.scanClearRecent}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {recentHosts.map((recentHost) => (
              <button
                key={recentHost}
                type="button"
                onClick={() => setHost(recentHost)}
                className="border border-line bg-white px-3 py-2 text-sm font-black text-night transition hover:border-secure hover:text-secure"
              >
                {recentHost}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm font-bold text-fault">{error}</p> : null}
    </form>
  );
}

function readRecentHosts() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(recentScanHostsKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string").slice(0, maxRecentScanHosts);
  } catch {
    return [];
  }
}

export function rememberRecentScanHost(host: string) {
  const normalizedHost = host.trim();
  if (!normalizedHost) return;
  const nextHosts = [normalizedHost, ...readRecentHosts().filter((item) => item !== normalizedHost)].slice(0, maxRecentScanHosts);
  window.localStorage.setItem(recentScanHostsKey, JSON.stringify(nextHosts));
  window.dispatchEvent(new Event("sslconf:recent-scans-changed"));
}
