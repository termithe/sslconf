import type { Metadata } from "next";
import { CertificateKeyMatcherClient } from "@/components/CertificateKeyMatcherClient";

export const metadata: Metadata = { title: "Comprobador de certificado y clave privada", description: "Comprueba si un certificado PEM y una clave privada PEM pertenecen al mismo par de claves." };

export default function SpanishKeyMatcherPage() {
  return <main className="px-4 py-12 sm:py-16"><div className="mx-auto max-w-6xl"><section><div className="inline-flex items-center gap-2 border-l-2 border-signal pl-3 text-xs font-black uppercase tracking-[0.18em] text-signal"><span className="h-2 w-2 bg-secure" />Diagnóstico SSL/TLS</div><h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">Comprobador de certificado y clave.</h1><p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">Confirma que el certificado y la clave privada pertenecen al mismo par de claves.</p></section><div className="mt-8"><CertificateKeyMatcherClient locale="es" /></div></div></main>;
}
