import type { Metadata } from "next";
import { HomeContent } from "@/components/HomeContent";

export const metadata: Metadata = {
  title: "SSL/TLS Tools",
  description: "Run SSL/TLS diagnostics, grade HTTPS server configuration and generate server-ready CA bundle PEM files."
};

export default function HomePage() {
  return <HomeContent locale="en" />;
}
