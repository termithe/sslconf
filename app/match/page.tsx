import type { Metadata } from "next";
import { CertificateKeyMatcherClient } from "@/components/CertificateKeyMatcherClient";

export const metadata: Metadata = { title: "Certificate and Private Key Matcher", description: "Check whether a PEM certificate and PEM private key belong to the same key pair." };

export default function KeyMatcherPage() {
  return <main className="px-4 py-12 sm:py-16"><div className="mx-auto max-w-6xl"><section><div className="inline-flex items-center gap-2 border-l-2 border-signal pl-3 text-xs font-black uppercase tracking-[0.18em] text-signal"><span className="h-2 w-2 bg-secure" />SSL/TLS Diagnostics</div><h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">Certificate &amp; Key Matcher.</h1><p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">Confirm that a certificate and private key form the same key pair.</p></section><div className="mt-8"><CertificateKeyMatcherClient locale="en" /></div></div></main>;
}
