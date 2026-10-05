"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { copy, type Locale } from "@/lib/i18n";

export function TLSChainForm({ defaultHost = "", defaultIncludeRoot = false, locale = "en" }: { defaultHost?: string; defaultIncludeRoot?: boolean; locale?: Locale }) {
  const [host, setHost] = useState(defaultHost);
  const [includeRoot, setIncludeRoot] = useState(defaultIncludeRoot);
  const [error, setError] = useState("");
  const text = copy[locale];

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!host.trim()) {
      setError(text.emptyHost);
      return;
    }
    setError("");
    const params = new URLSearchParams({ host: host.trim() });
    if (includeRoot) params.set("includeRoot", "1");
    window.location.assign(`${locale === "es" ? "/es" : ""}/check?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="tool-form p-5 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-ink/55">{text.formLabel}</span>
          <input
            value={host}
            onChange={(event) => setHost(event.target.value)}
            placeholder={text.formPlaceholder}
            className="h-14 w-full border border-line bg-white px-4 text-lg font-semibold text-night outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/15"
          />
        </label>
        <button className="inline-flex h-14 items-center justify-center gap-2 bg-night px-6 font-black text-white transition hover:bg-signal">
          <Search size={18} />
          {text.formSubmit}
        </button>
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm font-bold text-ink/70">
        <input
          type="checkbox"
          checked={includeRoot}
          onChange={(event) => setIncludeRoot(event.target.checked)}
          className="h-4 w-4 accent-signal"
        />
        {text.includeRoot}
      </label>
      {error ? <p className="mt-3 text-sm font-bold text-fault">{error}</p> : null}
    </form>
  );
}
