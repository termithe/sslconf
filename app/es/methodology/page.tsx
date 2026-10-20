import type { Metadata } from "next";
import { MethodologyContent } from "@/components/MethodologyContent";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/es/methodology", "Metodología del análisis SSL/TLS", "Conoce la puntuación, evidencias, cobertura de endpoints y límites del Análisis SSL/TLS de SSLConf.", searchParams);
}

export default function SpanishMethodologyPage() {
  return <MethodologyContent locale="es" />;
}
