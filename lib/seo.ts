import type { Metadata } from "next";

export const siteOrigin = "https://www.sslconf.com";
export const toolPaths = ["/", "/scan", "/check", "/installation", "/headers", "/decode", "/csr", "/csr/generate", "/match", "/methodology", "/privacy", "/acceptable-use"] as const;
export type SeoSearchParams = Record<string, string | string[] | undefined>;

export function languageUrls(path: string) {
  const english = path === "/es" ? "/" : path.replace(/^\/es\//, "/");
  return {
    en: siteOrigin + english,
    es: siteOrigin + (english === "/" ? "/es" : `/es${english}`),
    "x-default": siteOrigin + english
  };
}

export function pageMetadata(path: string, title: string, description: string, searchParams: SeoSearchParams = {}): Metadata {
  const resultPage = Object.prototype.hasOwnProperty.call(searchParams, "host");
  const url = siteOrigin + path;
  return {
    title: { absolute: `${title} | SSLConf` },
    description,
    alternates: resultPage ? undefined : { canonical: url, languages: languageUrls(path) },
    robots: { index: !resultPage, follow: true },
    openGraph: { type: "website", siteName: "SSLConf", title, description, url, locale: path.startsWith("/es") ? "es_ES" : "en_US" },
    twitter: { card: "summary", title, description }
  };
}
