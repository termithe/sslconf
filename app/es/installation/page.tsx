import type { Metadata } from "next";
import { TLSInstallationValidator } from "@/components/TLSInstallationValidator";

export const metadata: Metadata = { title: "Validador de instalación TLS", description: "Valida la instalación de certificado entregada por un endpoint HTTPS público." };

export default function SpanishInstallationPage({ searchParams }: { searchParams: { host?: string } }) {
  const host = searchParams.host?.trim() ?? "";
  return <main className="px-4 py-12 sm:py-16"><div className="mx-auto max-w-6xl"><section><div className="inline-flex items-center gap-2 border-l-2 border-secure pl-3 text-xs font-black uppercase tracking-[0.18em] text-secure"><span className="h-2 w-2 bg-secure" />Diagnóstico SSL/TLS</div><h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">Validador de instalación TLS.</h1><p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">Valida el certificado que entrega realmente un endpoint HTTPS público.</p></section><div className="mt-8"><TLSInstallationValidator defaultHost={host} locale="es" /></div></div></main>;
}
