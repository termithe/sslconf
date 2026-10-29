import type { Metadata } from "next";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";
import { CsrDecoderClient } from "@/components/CsrDecoderClient";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { copy } from "@/lib/i18n";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/es/csr", "Decodificador y validador de CSR", "Decodifica y valida solicitudes PKCS#10, incluida su firma, clave pública y nombres alternativos solicitados.", searchParams);
}

export default function SpanishCsrPage() {
  const text = copy.es;
  return (
    <main className="px-4 py-12 sm:py-16"><div className="mx-auto max-w-6xl">
      <section>
        <div className="inline-flex items-center gap-2 border-l-2 border-signal pl-3 text-xs font-black uppercase tracking-[0.18em] text-signal"><span className="h-2 w-2 bg-secure" />SSL/TLS Diagnostics</div>
        <h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">{text.csrTitle}</h1>
        <p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">{text.csrDescription}</p>
      </section>
      <div className="mt-8"><CsrDecoderClient locale="es" /></div>
      <ToolSeoContent locale="es" tool="csr" />
    </div></main>
  );
}
