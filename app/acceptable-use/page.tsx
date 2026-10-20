import type { Metadata } from "next";
import { PolicyContent } from "@/components/PolicyContent";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/acceptable-use", "Responsible Use", "Rules and limits for using SSLConf public SSL/TLS and certificate tools.", searchParams);
}

export default function AcceptableUsePage() {
  return <PolicyContent locale="en" policy="acceptable" />;
}
