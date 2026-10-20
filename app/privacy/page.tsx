import type { Metadata } from "next";
import { PolicyContent } from "@/components/PolicyContent";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/privacy", "Privacy and Data Use", "How SSLConf processes public scan targets, browser preferences and technical request data.", searchParams);
}

export default function PrivacyPage() {
  return <PolicyContent locale="en" policy="privacy" />;
}
