import "./globals.css";
import ClientProviders from "@/components/shared/client-providers";
import { getSetting } from "@/lib/actions/setting.actions";
import { Suspense } from "react";
import type { Metadata } from "next";
import {
  getMetadataBase,
  normalizeSiteUrl,
  PUBLIC_ROBOTS,
  splitKeywords,
  toAbsoluteUrl,
} from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const {
    site: { slogan, name, description, url, logo, keywords, author },
  } = await getSetting();

  const siteUrl = normalizeSiteUrl(url);
  const title = `${name} | ${slogan}`;
  const imageUrl = toAbsoluteUrl(url, logo || "/icons/logo.png");

  return {
    metadataBase: getMetadataBase(url),
    applicationName: name,
    title: {
      template: `%s | ${name}`,
      default: slogan,
    },
    description,
    keywords: splitKeywords(keywords),
    creator: author || name,
    publisher: name,
    referrer: "origin-when-cross-origin",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: name,
      images: [
        { url: imageUrl, width: 1200, height: 630, alt: `${name} - ${slogan}` },
      ],
      type: "website",
      locale: "en_KE",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
    robots: PUBLIC_ROBOTS,
    icons: {
      icon: [{ url: "/favicon.ico" }],
      shortcut: ["/favicon.ico"],
      apple: [{ url: "/favicon.ico" }],
    },
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const setting = await getSetting();

  const currency = "KES";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased leading-relaxed tracking-wide">
        <Suspense fallback={null}>
          <ClientProviders setting={{ ...setting, currency }}>
            {children}
          </ClientProviders>
        </Suspense>
      </body>
    </html>
  );
}
