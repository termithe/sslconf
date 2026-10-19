import type { Metadata } from "next";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";
import { HttpSecurityHeadersClient } from "@/components/HttpSecurityHeadersClient";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/es/headers", "Analizador de cabeceras de seguridad", "Analiza las cabeceras de seguridad entregadas por un endpoint HTTPS público.", searchParams);
}
export default function SpanishHeadersPage({ searchParams }: { searchParams: { host?: string } }) { return <main className="px-4 py-12 sm:py-16"><div className="mx-auto max-w-6xl"><section><div className="inline-flex items-center gap-2 border-l-2 border-secure pl-3 text-xs font-black uppercase tracking-[0.18em] text-secure"><span className="h-2 w-2 bg-secure" />Diagnóstico SSL/TLS</div><h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">Analizador de cabeceras de seguridad.</h1><p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">Revisa las cabeceras de seguridad del navegador que entrega un endpoint HTTPS público.</p></section><div className="mt-8"><HttpSecurityHeadersClient defaultHost={searchParams.host?.trim() ?? ""} locale="es" /></div></div></main>; }
