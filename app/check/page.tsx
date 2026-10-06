import type { Metadata } from "next";
import { TLSChainClient } from "@/components/TLSChainClient";
import { TLSChainForm } from "@/components/TLSChainForm";
import { copy } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "TLS chain result",
  robots: { index: false, follow: false }
};

export default function CheckPage({ searchParams }: { searchParams: { host?: string; includeRoot?: string } }) {
  const host = searchParams.host?.trim() ?? "";
  const includeRoot = searchParams.includeRoot === "1";
  const text = copy.en;

  return (
    <main className="px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        {!host ? (
          <section>
            <div>
              <div className="inline-flex items-center gap-2 border-l-2 border-signal pl-3 text-xs font-black uppercase tracking-[0.18em] text-signal">
                <span className="h-2 w-2 bg-secure" />
                SSL/TLS Diagnostics
              </div>
              <h1 className="mt-5 max-w-4xl text-balance font-serif text-[2.6rem] font-semibold leading-[1.04] text-night sm:text-6xl">
                {text.resultTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-ink/70">
                {text.homeTools[1][1]}
              </p>
              <div className="mt-8"><TLSChainForm defaultHost={host} defaultIncludeRoot={includeRoot} locale="en" /></div>
            </div>
          </section>
        ) : (
          <>
            <div className="mb-6"><TLSChainForm defaultHost={host} defaultIncludeRoot={includeRoot} locale="en" /></div>
            <TLSChainClient host={host} includeRoot={includeRoot} locale="en" />
          </>
        )}
      </div>
    </main>
  );
}
