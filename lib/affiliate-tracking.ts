export const AFFILIATE_TRACKING_COOKIE_KEY = "affiliate_code";

export const LEGACY_AFFILIATE_TRACKING_COOKIE_KEYS = [
  "affiliateCode",
] as const;

export const getAffiliateCodeFromCookieKeys = (
  getValue: (key: string) => string | undefined,
) => {
  const keys = [
    AFFILIATE_TRACKING_COOKIE_KEY,
    ...LEGACY_AFFILIATE_TRACKING_COOKIE_KEYS,
  ];

  for (const key of keys) {
    const value = (getValue(key) || "").trim();
    if (value) {
      return {
        key,
        value,
      };
    }
  }

  return null;
};