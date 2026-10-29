import type { Metadata } from "next";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";
import { TLSChainClient } from "@/components/TLSChainClient";
import { TLSChainForm } from "@/components/TLSChainForm";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { copy } from "@/lib/i18n";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/es/check", "Generador de CA bundle y comprobador de cadena TLS", "Reconstruye una cadena de certificados TLS y descarga sus certificados CA intermedios en un bundle PEM para Apache o nginx.", searchParams);
}

export default function SpanishCheckPage({ searchParams }: { searchParams: { host?: string; includeRoot?: string } }) {
  const host = searchParams.host?.trim() ?? "";
  const includeRoot = searchParams.includeRoot === "1";
  const text = copy.es;

  return (
    <main className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        {!host ? (
          <section>
            <div>
              <div className="inline-flex items-center gap-2 border-l-2 border-signal pl-3 text-xs font-black uppercase tracking-[0.18em] text-signal">
                <span className="h-2 w-2 bg-secure" />
                SSL/TLS Diagnostics
              </div>
              <h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">
                {text.resultTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">
                {text.homeTools[3][1]}
              </p>
              <div className="mt-8"><TLSChainForm defaultHost={host} defaultIncludeRoot={includeRoot} locale="es" /></div>
            </div>
          </section>
        ) : (
          <>
            <div className="mb-6"><TLSChainForm defaultHost={host} defaultIncludeRoot={includeRoot} locale="es" /></div>
            <TLSChainClient host={host} includeRoot={includeRoot} locale="es" />
          </>
        )}
        {!host ? <ToolSeoContent locale="es" tool="check" /> : null}
      </div>
    </main>
  );
}
