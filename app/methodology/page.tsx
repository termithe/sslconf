import type { Metadata } from "next";
import { MethodologyContent } from "@/components/MethodologyContent";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/methodology", "SSL/TLS Server Test Methodology", "Understand SSLConf scoring, evidence, endpoint coverage and the limits of the SSL/TLS Server Test.", searchParams);
}

export default function MethodologyPage() {
  return <MethodologyContent locale="en" />;
}
