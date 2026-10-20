import type { Metadata } from "next";
import { PolicyContent } from "@/components/PolicyContent";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/es/acceptable-use", "Uso responsable", "Normas y límites para las herramientas públicas SSL/TLS y de certificados de SSLConf.", searchParams);
}

export default function AcceptableUsePage() {
  return <PolicyContent locale="es" policy="acceptable" />;
}
