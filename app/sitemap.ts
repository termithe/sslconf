import type { MetadataRoute } from "next";
import { languageUrls, toolPaths } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return toolPaths.flatMap((path) => {
    const languages = languageUrls(path);
    return [languages.en, languages.es].map((url) => ({ url, alternates: { languages } }));
  });
}
