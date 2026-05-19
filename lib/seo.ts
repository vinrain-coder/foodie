import type { Metadata } from "next";

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;

type MetadataRobots = NonNullable<Metadata["robots"]>;

export const PUBLIC_ROBOTS: MetadataRobots = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
};

export const PRIVATE_ROBOTS: MetadataRobots = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
    "max-video-preview": 0,
    "max-image-preview": "none",
    "max-snippet": 0,
  },
};

export function normalizeSiteUrl(siteUrl: string): string {
  const raw = siteUrl?.trim() || "http://localhost:3000";
  const withProtocol = ABSOLUTE_URL_PATTERN.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

export function getMetadataBase(siteUrl: string): URL {
  return new URL(normalizeSiteUrl(siteUrl));
}

export function toAbsoluteUrl(siteUrl: string, pathOrUrl = "/"): string {
  if (!pathOrUrl) return normalizeSiteUrl(siteUrl);
  if (ABSOLUTE_URL_PATTERN.test(pathOrUrl)) return pathOrUrl;
  const normalizedPath = pathOrUrl.startsWith("/")
    ? pathOrUrl
    : `/${pathOrUrl}`;
  return `${normalizeSiteUrl(siteUrl)}${normalizedPath}`;
}

export function splitKeywords(
  keywords?: string | string[] | null,
): string[] | undefined {
  if (!keywords) return undefined;
  if (Array.isArray(keywords)) {
    const cleaned = keywords.map((keyword) => keyword.trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : undefined;
  }

  const cleaned = keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  return cleaned.length > 0 ? cleaned : undefined;
}
