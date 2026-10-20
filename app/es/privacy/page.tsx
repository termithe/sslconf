import type { Metadata } from "next";
import { PolicyContent } from "@/components/PolicyContent";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/es/privacy", "Privacidad y uso de datos", "Cómo procesa SSLConf destinos públicos, preferencias del navegador y datos técnicos de solicitudes.", searchParams);
}

export default function PrivacyPage() {
  return <PolicyContent locale="es" policy="privacy" />;
}
