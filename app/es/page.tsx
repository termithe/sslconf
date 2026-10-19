import type { Metadata } from "next";
import { pageMetadata, type SeoSearchParams } from "@/lib/seo";
import { HomeContent } from "@/components/HomeContent";

export function generateMetadata({ searchParams }: { searchParams: SeoSearchParams }): Metadata {
  return pageMetadata("/es", "Herramientas SSL/TLS: análisis, certificados y CSR", "Ejecuta diagnósticos SSL/TLS, puntúa la configuración HTTPS y genera CA bundles PEM listos para servidor.", searchParams);
}

export default function SpanishHomePage() {
  return <HomeContent locale="es" />;
}
