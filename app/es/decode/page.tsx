import type { Metadata } from "next";
import { CertificateDecoderClient } from "@/components/CertificateDecoderClient";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Decodificador de certificados",
  description: "Decodifica un certificado PEM o DER codificado en Base64 e inspecciona identidad, validez, huellas y extensiones X.509."
};

export default function SpanishDecodePage() {
  const text = copy.es;
  return (
    <main className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <section>
          <div className="inline-flex items-center gap-2 border-l-2 border-signal pl-3 text-xs font-black uppercase tracking-[0.18em] text-signal">
            <span className="h-2 w-2 bg-secure" />
            SSL/TLS Diagnostics
          </div>
          <h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">{text.decoderTitle}</h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">{text.decoderDescription}</p>
        </section>
        <div className="mt-8"><CertificateDecoderClient locale="es" /></div>
      </div>
    </main>
  );
}
