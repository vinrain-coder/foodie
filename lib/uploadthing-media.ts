type UnknownRecord = Record<string, unknown>;

export type UploadthingClientFile =
  | {
      ufsUrl?: string;
      url?: string;
      appUrl?: string;
      key?: string;
      name?: string;
      type?: string;
    }
  | UnknownRecord;

export const sanitizeMediaUrl = (value?: string | null): string => {
  const input = String(value || "").trim();
  if (!input) return "";
  const lower = input.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "";
  if (input.startsWith("/") || input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }
  return "";
};

export const isSafeMediaUrl = (value?: string | null): value is string =>
  sanitizeMediaUrl(value).length > 0;

export const getUploadthingFileUrl = (file?: UploadthingClientFile | null) => {
  if (!file || typeof file !== "object") return "";
  const candidate =
    (file as { ufsUrl?: string }).ufsUrl ||
    (file as { url?: string }).url ||
    (file as { appUrl?: string }).appUrl ||
    "";
  return sanitizeMediaUrl(candidate);
};

export const getMediaTypeFromUrl = (url: string): "image" | "video" =>
  /\.(mp4|webm|mov|ogg)$/i.test(url) ? "video" : "image";

export const isUploadthingHost = (hostname: string) =>
  hostname === "utfs.io" ||
  hostname.endsWith(".ufs.sh") ||
  hostname.endsWith(".uploadthing.com") ||
  hostname === "uploadthing.com";

export const extractUploadthingFileKey = (input: string) => {
  const source = sanitizeMediaUrl(input);
  if (!source) return "";

  try {
    const parsed = new URL(source);
    if (!isUploadthingHost(parsed.hostname)) return "";
    const segments = parsed.pathname.split("/").filter(Boolean);
    const fIndex = segments.findIndex((segment) => segment === "f");
    const key =
      fIndex >= 0 && segments[fIndex + 1]
        ? decodeURIComponent(segments[fIndex + 1])
        : decodeURIComponent(segments[segments.length - 1] || "");
    return key;
  } catch {
    return "";
  }
};

export const dedupeMediaUrls = (urls: string[]) => Array.from(new Set(urls));
