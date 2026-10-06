import type { Metadata } from "next";
import { CsrGeneratorClient } from "@/components/CsrGeneratorClient";

export const metadata: Metadata = { title: "CSR Generator", description: "Generate a PKCS#10 certificate signing request and private key directly in your browser." };
export default function CsrGeneratorPage() { return <main className="px-4 py-12 sm:py-16"><div className="mx-auto max-w-6xl"><section><div className="inline-flex items-center gap-2 border-l-2 border-signal pl-3 text-xs font-black uppercase tracking-[0.18em] text-signal"><span className="h-2 w-2 bg-secure" />SSL/TLS Diagnostics</div><h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">CSR Generator.</h1><p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">Create a PKCS#10 request and its private key directly in your browser.</p></section><div className="mt-8"><CsrGeneratorClient locale="en" /></div></div></main>; }
