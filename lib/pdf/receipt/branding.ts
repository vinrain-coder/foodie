import type { ISettingInput } from "@/types";
import type { ReceiptBranding } from "./types";

const toAbsoluteUrl = (value: string | undefined, baseUrl?: string) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) {
    return value;
  }
  if (!baseUrl) return value;
  return `${baseUrl.replace(/\/+$/, "")}/${value.replace(/^\/+/, "")}`;
};

const extractSocialValue = (url: string, fallbackLabel: string) => {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last) return parsed.host;
    if (last.startsWith("@")) return last;
    if (fallbackLabel.toLowerCase() === "whatsapp") {
      return `+${last}`;
    }
    return `@${last}`;
  } catch {
    return url;
  }
};

const pushSocial = (
  socials: NonNullable<ReceiptBranding["socials"]>,
  label: string,
  link?: string,
) => {
  if (!link) return;
  socials.push({ label, value: extractSocialValue(link, label) });
};

const normalizeLogoUrl = (logo: string | undefined, baseUrl?: string) => {
  if (!logo) return toAbsoluteUrl("/icons/logo.png", baseUrl);
  const lower = logo.toLowerCase();
  if (lower.endsWith(".svg")) {
    return toAbsoluteUrl("/icons/logo.png", baseUrl);
  }
  return toAbsoluteUrl(logo, baseUrl);
};

export const buildReceiptBrandingFromSetting = (
  setting: ISettingInput,
  baseUrl?: string,
): ReceiptBranding => {
  const socials: NonNullable<ReceiptBranding["socials"]> = [];
  const logoUrl = normalizeLogoUrl(setting.site.logo, baseUrl);

  pushSocial(socials, "Instagram", setting.socialMedia.instagram);
  pushSocial(socials, "X", setting.socialMedia.twitter);
  pushSocial(socials, "TikTok", setting.socialMedia.tiktok);
  pushSocial(socials, "YouTube", setting.socialMedia.youtube);
  pushSocial(socials, "Facebook", setting.socialMedia.facebook);
  pushSocial(socials, "WhatsApp", setting.socialMedia.whatsapp);

  return {
    brandName: setting.site.name,
    slogan: setting.site.slogan,
    accentText: setting.site.slogan,
    website: setting.site.url,
    supportEmail: setting.site.email,
    supportPhone: setting.site.phone,
    supportAddress: setting.site.address,
    logoUrl,
    watermarkLogoUrl: logoUrl,
    socials,
    legalLine: setting.site.copyright,
  };
};
