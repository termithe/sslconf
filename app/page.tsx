import type { Metadata } from "next";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";
import { HomeContent } from "@/components/HomeContent";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/", "SSL/TLS Tools: Server Test, Certificates and CSR", "Run SSL/TLS diagnostics, grade HTTPS server configuration and generate server-ready CA bundle PEM files.", searchParams);
}

export default function HomePage() {
  return <HomeContent locale="en" />;
}
