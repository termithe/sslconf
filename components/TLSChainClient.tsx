"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { TLSChainResult } from "./TLSChainResult";
import type { Locale } from "@/lib/i18n";
import type { TLSChainResponse } from "@/lib/types";

export function TLSChainClient({ host, includeRoot, locale = "en" }: { host: string; includeRoot: boolean; locale?: Locale }) {
  const [result, setResult] = useState<TLSChainResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError("");

    async function run() {
      const response = await fetch("/api/tls/chain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ host, includeRoot, locale }),
        signal: controller.signal
      });
      const text = await response.text();
      const payload = text ? parseJson(text) : null;
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}: la API no devolvió un error JSON.`);
      setResult(payload as TLSChainResponse);
    }

    run().catch((caught) => {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Error inesperado.");
    });

    return () => controller.abort();
  }, [host, includeRoot, locale]);

  if (error) return <ErrorState message={error} locale={locale} />;
  if (!result) return <LoadingState locale={locale} />;
  return <TLSChainResult result={result} locale={locale} />;
}

function parseJson(text: string) {
  try {
    return JSON.parse(text) as Partial<TLSChainResponse> & { error?: string };
  } catch {
    return null;
  }
}
