import type { Metadata } from "next";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";
import { CertificateDecoderClient } from "@/components/CertificateDecoderClient";
import { ToolSeoContent } from "@/components/ToolSeoContent";
import { copy } from "@/lib/i18n";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/decode", "SSL Certificate Decoder", "Decode a PEM certificate or Base64-encoded DER. Inspect X.509 subject, issuer, validity, fingerprints, public key and extensions.", searchParams);
}

export default function DecodePage() {
  const text = copy.en;
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
        <div className="mt-8"><CertificateDecoderClient locale="en" /></div>
        <ToolSeoContent locale="en" tool="decode" />
      </div>
    </main>
  );
}
