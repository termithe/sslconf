import type { Metadata } from "next";
import { pageMetadata, siteOrigin, type SeoSearchParams } from "@/lib/seo";
import { HomeContent } from "@/components/HomeContent";
import { JsonLd } from "@/components/JsonLd";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/", "SSL Checker & TLS Diagnostic Tools", "Test SSL certificates, analyze TLS configurations, check HTTP security headers, decode certificates, generate CSRs and build CA bundles with free online tools.", searchParams);
}

export default function HomePage() {
  return <>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: "SSLConf", url: `${siteOrigin}/` }} />
    <HomeContent locale="en" />
  </>;
}
