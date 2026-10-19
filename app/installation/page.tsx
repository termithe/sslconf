import type { Metadata } from "next";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";
import { TLSInstallationValidator } from "@/components/TLSInstallationValidator";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/installation", "TLS Installation Validator", "Validate the certificate installation delivered by a public HTTPS endpoint.", searchParams);
}

export default function InstallationPage({ searchParams }: { searchParams: { host?: string } }) {
  const host = searchParams.host?.trim() ?? "";
  return <main className="px-4 py-12 sm:py-16"><div className="mx-auto max-w-6xl"><section><div className="inline-flex items-center gap-2 border-l-2 border-secure pl-3 text-xs font-black uppercase tracking-[0.18em] text-secure"><span className="h-2 w-2 bg-secure" />SSL/TLS Diagnostics</div><h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">TLS Installation Validator.</h1><p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">Validate the certificate actually delivered by a public HTTPS endpoint.</p></section><div className="mt-8"><TLSInstallationValidator defaultHost={host} locale="en" /></div></div></main>;
}
