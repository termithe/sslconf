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
  description: "Inspect TLS certificates, rebuild certificate chains and generate server-ready CA bundle PEM files.",
  applicationName: "SSLConf",
  category: "technology",
  openGraph: {
    type: "website",
    siteName: "SSLConf",
    title: "SSLConf",
    description: "SSL/TLS configuration tools, certificate chain checker and CA bundle generator.",
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
          <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5">
            <a href="/" className="flex items-center gap-3" aria-label="SSLConf">
              <span className="relative grid h-9 w-9 shrink-0 place-items-center border border-night bg-night">
                <span className="absolute top-2 h-3 w-4 border-2 border-mint border-b-0" />
                <span className="mt-2 h-4 w-5 bg-signal" />
                <span className="absolute bottom-2 right-2 h-2 w-2 bg-secure" />
              </span>
              <span className="text-lg font-black tracking-[0.08em] text-night">
                SSL<span className="text-signal">CONF</span>
              </span>
            </a>
            <div className="flex items-center gap-3">
              <div className="hidden items-center divide-x divide-line border-x border-line lg:flex">
                <a href={`${prefix || ""}/scan`} className="px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-ink/60 transition hover:bg-mint hover:text-signal">
                  {copy[locale].navScan}
                </a>
                <a href={`${prefix || ""}/decode`} className="px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-ink/60 transition hover:bg-mint hover:text-signal">
                  {copy[locale].navDecoder}
                </a>
                <a href={`${prefix || ""}/check`} className="px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-ink/60 transition hover:bg-mint hover:text-signal">
                  {copy[locale].navChain}
                </a>
              </div>
              <span className="hidden text-xs font-black uppercase tracking-[0.16em] text-ink/55 sm:block">{copy[locale].navTag}</span>
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
