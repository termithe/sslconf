import type { Metadata } from "next";
import { CsrDecoderClient } from "@/components/CsrDecoderClient";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "CSR Decoder and Validator",
  description: "Decode and validate PKCS#10 certificate signing requests, including signature, public key and subject alternative names."
};

export default function CsrPage() {
  const text = copy.en;
  return (
    <main className="px-4 py-12 sm:py-16"><div className="mx-auto max-w-6xl">
      <section>
        <div className="inline-flex items-center gap-2 border-l-2 border-signal pl-3 text-xs font-black uppercase tracking-[0.18em] text-signal"><span className="h-2 w-2 bg-secure" />SSL/TLS Diagnostics</div>
        <h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">{text.csrTitle}</h1>
        <p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">{text.csrDescription}</p>
      </section>
      <div className="mt-8"><CsrDecoderClient locale="en" /></div>
    </div></main>
  );
}
