import type { Metadata } from "next";
import { headers } from "next/headers";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { copy, type Locale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://sslconf.com"),
  title: {
    default: "SSLConf",
    template: "%s | SSLConf"
  },
  description: "Test public SSL/TLS servers, decode certificates and CSRs, rebuild certificate chains and generate server-ready CA bundle PEM files.",
  applicationName: "SSLConf",
  category: "technology",
  openGraph: {
    type: "website",
    siteName: "SSLConf",
    title: "SSLConf",
    description: "SSL/TLS server testing, certificate and CSR decoding, certificate chain checking and CA bundle generation.",
    url: "/"
  },
  icons: { icon: "/icon.svg" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale: Locale = headers().get("x-sslconf-locale") === "es" ? "es" : "en";
  const prefix = locale === "es" ? "/es" : "";

  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b border-line bg-[#fbfcfd]/95 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center gap-8 px-4 py-5">
            <a href={prefix || "/"} className="flex items-center gap-3" aria-label="SSLConf">
              <span className="relative grid h-9 w-9 shrink-0 place-items-center border border-night bg-night">
                <span className="absolute top-2 h-3 w-4 border-2 border-mint border-b-0" />
                <span className="mt-2 h-4 w-5 bg-signal" />
                <span className="absolute bottom-2 right-2 h-2 w-2 bg-secure" />
              </span>
              <span className="text-lg font-black tracking-[0.08em] text-night">
                SSL<span className="text-signal">CONF</span>
              </span>
            </a>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center border-x border-line lg:flex">
                <a href={`${prefix || ""}/scan`} className="px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-ink/60 transition hover:bg-mint hover:text-signal">
                  {copy[locale].navScan}
                </a>
                <details className="group relative border-l border-line">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-ink/60 transition hover:bg-mint hover:text-signal">
                    {copy[locale].navTools}
                    <span className="text-base leading-none transition group-open:rotate-45">+</span>
                  </summary>
                  <div className="absolute right-0 top-full z-50 mt-px w-72 border border-line bg-white p-1 shadow-[0_12px_28px_rgba(22,33,45,0.12)]">
                    <HeaderToolLink href={`${prefix || ""}/check`} label={copy[locale].navChain} />
                    <HeaderToolLink href={`${prefix || ""}/decode`} label={copy[locale].navDecoder} />
                    <HeaderToolLink href={`${prefix || ""}/csr`} label={copy[locale].navCsr} />
                    <HeaderToolLink href={`${prefix || ""}/match`} label={locale === "es" ? "Comprobador de certificado y clave" : "Certificate & Key Matcher"} />
                    <HeaderToolLink href={`${prefix || ""}/csr/generate`} label={locale === "es" ? "Generador de CSR" : "CSR Generator"} />
                  </div>
                </details>
              </div>
              <LanguageSwitcher />
            </div>
          </nav>
        </header>
        {children}
        <footer className="border-t border-line px-4 py-8 text-center text-xs font-bold uppercase tracking-[0.16em] text-ink/45">
          SSLConf
        </footer>
      </body>
    </html>
  );
}

function HeaderToolLink({ href, label }: { href: string; label: string }) {
  return <a href={href} className="block px-3 py-2.5 text-xs font-black uppercase tracking-[0.1em] text-ink/65 transition hover:bg-mint hover:text-signal">{label}</a>;
}
