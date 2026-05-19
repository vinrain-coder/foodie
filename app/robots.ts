import { MetadataRoute } from "next";
import { getSetting } from "@/lib/actions/setting.actions";
import { normalizeSiteUrl, toAbsoluteUrl } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { site } = await getSetting();
  const siteUrl = normalizeSiteUrl(site.url);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/checkout",
          "/account",
          "/cart",
          "/api",
          "/unauthorized",
          "/forbidden",
          "/maintenance",
        ],
      },
    ],
    sitemap: toAbsoluteUrl(site.url, "/sitemap.xml"),
    host: siteUrl,
  };
}
