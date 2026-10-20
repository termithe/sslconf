import type { Metadata } from "next";
import { headers } from "next/headers";
import { Mail, Menu, ShieldCheck } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { copy, type Locale } from "@/lib/i18n";
import "./globals.css";
import { siteOrigin } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
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
          <nav className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-8 sm:py-5">
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
              <details className="group relative lg:hidden">
                <summary title={locale === "es" ? "Abrir menú" : "Open menu"} aria-label={locale === "es" ? "Abrir menú" : "Open menu"} className="grid h-9 w-9 cursor-pointer list-none place-items-center border border-line bg-white text-ink/65 transition hover:border-signal hover:bg-mint hover:text-signal">
                  <Menu size={18} aria-hidden="true" />
                </summary>
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] border border-line bg-white p-1 shadow-[0_12px_28px_rgba(22,33,45,0.12)]">
                  <HeaderToolLink href={`${prefix || ""}/scan`} label={copy[locale].navScan} />
                  <HeaderToolLink href={`${prefix || ""}/installation`} label={copy[locale].navInstallation} />
                  <HeaderToolLink href={`${prefix || ""}/headers`} label={copy[locale].navHeaders} />
                  <HeaderToolLink href={`${prefix || ""}/check`} label={copy[locale].navChain} />
                  <HeaderToolLink href={`${prefix || ""}/decode`} label={copy[locale].navDecoder} />
                  <HeaderToolLink href={`${prefix || ""}/csr`} label={copy[locale].navCsr} />
                  <HeaderToolLink href={`${prefix || ""}/match`} label={copy[locale].navMatcher} />
                  <HeaderToolLink href={`${prefix || ""}/csr/generate`} label={copy[locale].navCsrGenerator} />
                </div>
              </details>
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
                    <HeaderToolLink href={`${prefix || ""}/installation`} label={copy[locale].navInstallation} />
                    <HeaderToolLink href={`${prefix || ""}/headers`} label={copy[locale].navHeaders} />
                    <HeaderToolLink href={`${prefix || ""}/check`} label={copy[locale].navChain} />
                    <HeaderToolLink href={`${prefix || ""}/decode`} label={copy[locale].navDecoder} />
                    <HeaderToolLink href={`${prefix || ""}/csr`} label={copy[locale].navCsr} />
                    <HeaderToolLink href={`${prefix || ""}/match`} label={copy[locale].navMatcher} />
                    <HeaderToolLink href={`${prefix || ""}/csr/generate`} label={copy[locale].navCsrGenerator} />
                  </div>
                </details>
              </div>
              <LanguageSwitcher />
            </div>
          </nav>
        </header>
        {children}
        <SiteFooter locale={locale} prefix={prefix} />
      </body>
    </html>
  );
}

function HeaderToolLink({ href, label }: { href: string; label: string }) {
  return <a href={href} className="block px-3 py-2.5 text-xs font-black uppercase tracking-[0.1em] text-ink/65 transition hover:bg-mint hover:text-signal">{label}</a>;
}

function SiteFooter({ locale, prefix }: { locale: Locale; prefix: string }) {
  const footer = copy[locale];
  const toolLinks = [
    { href: `${prefix}/scan`, label: footer.footerServerTest },
    { href: `${prefix}/check`, label: footer.footerChainBuilder },
    { href: `${prefix}/headers`, label: footer.footerHeaders },
    { href: `${prefix}/methodology`, label: footer.footerMethodology }
  ];
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t-2 border-night bg-white px-4">
      <div className="mx-auto grid max-w-7xl gap-10 py-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] lg:gap-12">
        <section aria-label="SSLConf" className="max-w-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center border border-night bg-night text-mint"><ShieldCheck size={17} aria-hidden="true" /></span>
            <span className="text-sm font-black tracking-[0.08em] text-night">SSL<span className="text-signal">CONF</span></span>
          </div>
          <p className="mt-4 text-sm font-semibold leading-6 text-ink/65">{footer.footerSummary}</p>
        </section>
        <nav aria-label={footer.footerTools}>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-ink/45">{footer.footerTools}</p>
          <ul className="mt-4 space-y-2.5">
            {toolLinks.map((link) => <li key={link.href}><a href={link.href} className="text-sm font-bold text-ink/70 transition hover:text-signal">{link.label}</a></li>)}
          </ul>
        </nav>
        <section aria-labelledby="footer-security-title">
          <p id="footer-security-title" className="text-xs font-black uppercase tracking-[0.16em] text-ink/45">{footer.footerSecurity}</p>
          <div className="mt-4 space-y-2.5">
            <a href="mailto:contacto@sslconf.com" className="flex w-fit items-center gap-2 text-sm font-bold text-ink/70 transition hover:text-signal"><Mail size={15} aria-hidden="true" />{footer.footerContact}</a>
            <a href="/.well-known/security.txt" className="block w-fit text-sm font-bold text-ink/70 transition hover:text-signal">{footer.footerSecurityTxt}</a>
          </div>
        </section>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-line py-4 text-xs font-bold text-ink/45 sm:flex-row sm:items-center sm:justify-between">
        <span>{footer.footerCopyright}</span>
        <span>&copy; {year}</span>
      </div>
    </footer>
  );
}
