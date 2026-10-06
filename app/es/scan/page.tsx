import type { Metadata } from "next";
import { TLSServerScanClient } from "@/components/TLSServerScanClient";
import { TLSServerScanForm } from "@/components/TLSServerScanForm";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Análisis SSL/TLS",
  description: "Escanea un endpoint HTTPS público y puntúa su certificado TLS, protocolos, HSTS y CAA."
};

export default function SpanishScanPage({ searchParams }: { searchParams: { host?: string } }) {
  const host = searchParams.host?.trim() ?? "";
  const text = copy.es;

  return (
    <main className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <section>
          <div>
            <div className="inline-flex items-center gap-2 border-l-2 border-secure pl-3 text-xs font-black uppercase tracking-[0.18em] text-secure">
              <span className="h-2 w-2 bg-secure" />
              SSL/TLS Diagnostics
            </div>
            <h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">
              {text.scanTitle}
            </h1>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">
              {text.scanDescription}
            </p>
          </div>
        </section>
        <div className="mt-8"><TLSServerScanForm defaultHost={host} locale="es" /></div>
        {host ? (
          <section className="mt-6">
            <TLSServerScanClient host={host} locale="es" />
          </section>
        ) : null}
      </div>
    </main>
  );
}
