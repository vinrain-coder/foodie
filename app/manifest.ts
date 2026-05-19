import type { MetadataRoute } from "next";
import { getSetting } from "@/lib/actions/setting.actions";
import { normalizeSiteUrl } from "@/lib/seo";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { site } = await getSetting();
  const siteUrl = normalizeSiteUrl(site.url);

  return {
    name: site.name,
    short_name: site.name,
    description: site.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "en-KE",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icons/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    id: siteUrl,
  };
}
