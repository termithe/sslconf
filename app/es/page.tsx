import type { Metadata } from "next";
import { HomeContent } from "@/components/HomeContent";

export const metadata: Metadata = {
  title: "Herramientas SSL/TLS",
  description: "Ejecuta diagnósticos SSL/TLS, puntúa la configuración HTTPS y genera CA bundles PEM listos para servidor."
};

export default function SpanishHomePage() {
  return <HomeContent locale="es" />;
}
