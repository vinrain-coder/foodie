import { getSetting } from "@/lib/actions/setting.actions";
import { AffiliateCompetitionCadence } from "@/lib/db/models/affiliate-competition-period.model";

export const DEFAULT_COMPETITION_TIMEZONE = "UTC";

export const DEFAULT_MIN_QUALIFIED_ORDERS: Record<AffiliateCompetitionCadence, number> = {
  daily: 1,
  weekly: 2,
  monthly: 4,
  yearly: 12,
};

export type AffiliateCompetitionSettings = {
  timezone: string;
  minQualifiedOrders: Record<AffiliateCompetitionCadence, number>;
  refundRatioCeiling: number | null;
};

const isValidTimeZone = (value?: string | null) => {
  if (!value) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

const normalizeMinQualifiedOrders = (
  value: Partial<Record<AffiliateCompetitionCadence, number>> | undefined,
) => {
  const next = { ...DEFAULT_MIN_QUALIFIED_ORDERS };

  for (const cadence of Object.keys(next) as AffiliateCompetitionCadence[]) {
    const candidate = Number(value?.[cadence]);
    if (Number.isFinite(candidate) && candidate >= 0) {
      next[cadence] = Math.floor(candidate);
    }
  }

  return next;
};

const normalizeRefundRatioCeiling = (value: unknown) => {
  const candidate = Number(value);
  if (!Number.isFinite(candidate)) {
    return null;
  }

  if (candidate < 0) return 0;
  if (candidate > 1) return 1;
  return candidate;
};

export async function getAffiliateCompetitionSettings(): Promise<AffiliateCompetitionSettings> {
  const setting = await getSetting();

  const competition = setting.affiliate?.competition || {};
  const siteTimeZone =
    setting.site?.timezone ||
    ((setting.site as unknown as { businessTimezone?: string })?.businessTimezone ?? "");

  const timezone = isValidTimeZone(competition.timezone)
    ? competition.timezone
    : isValidTimeZone(siteTimeZone)
      ? siteTimeZone
      : DEFAULT_COMPETITION_TIMEZONE;

  return {
    timezone,
    minQualifiedOrders: normalizeMinQualifiedOrders(competition.minQualifiedOrders),
    refundRatioCeiling: normalizeRefundRatioCeiling(competition.refundRatioCeiling),
  };
}
