import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  // Results must remain crawlable so search engines can see their noindex tag.
  return { rules: { userAgent: "*", allow: "/", disallow: "/api/" }, sitemap: `${siteOrigin}/sitemap.xml` };
}
