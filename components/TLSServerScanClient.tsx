"use client";

import { useEffect, useState } from "react";
import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";
import { rememberRecentScanHost } from "./TLSServerScanForm";
import { TLSServerScanResult } from "./TLSServerScanResult";
import type { Locale } from "@/lib/i18n";
import type { TlsScanResponse } from "@/lib/types";

export function TLSServerScanClient({ host, locale = "en" }: { host: string; locale?: Locale }) {
  const [result, setResult] = useState<TlsScanResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError("");

    async function run() {
      const response = await fetch("/api/tls/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ host, locale }),
        signal: controller.signal
      });
      const text = await response.text();
      const payload = text ? parseJson(text) : null;
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}: la API no devolvió un error JSON.`);
      const scanResult = payload as TlsScanResponse;
      rememberRecentScanHost(scanResult.host);
      setResult(scanResult);
    }

    run().catch((caught) => {
      if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Error inesperado.");
    });

    return () => controller.abort();
  }, [host, locale]);

  if (error) return <ErrorState message={error} locale={locale} />;
  if (!result) return <LoadingState locale={locale} label={copyLabel(locale)} />;
  return <TLSServerScanResult result={result} locale={locale} />;
}

function copyLabel(locale: Locale) {
  return locale === "es" ? "Analizando configuración SSL/TLS" : "Running SSL/TLS analysis";
}

function parseJson(text: string) {
  try {
    return JSON.parse(text) as Partial<TlsScanResponse> & { error?: string };
  } catch {
    return null;
  }
}
