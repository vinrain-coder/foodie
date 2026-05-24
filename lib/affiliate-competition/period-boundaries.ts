export type AffiliateCompetitionCadence =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly";

type CivilDate = {
  year: number;
  month: number;
  day: number;
};

const weekdayByShort: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string, withWeekday: boolean) => {
  const cacheKey = `${timeZone}:${withWeekday ? "weekday" : "core"}`;
  const existing = formatterCache.get(cacheKey);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    ...(withWeekday ? { weekday: "short" } : {}),
  });

  formatterCache.set(cacheKey, formatter);
  return formatter;
};

const getZonedParts = (date: Date, timeZone: string, withWeekday = false) => {
  const parts = getFormatter(timeZone, withWeekday).formatToParts(date);
  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const year = Number(lookup.year);
  const month = Number(lookup.month);
  const day = Number(lookup.day);
  const hour = Number(lookup.hour || "0");
  const minute = Number(lookup.minute || "0");
  const second = Number(lookup.second || "0");

  if (!year || !month || !day) {
    throw new Error(`Failed to resolve zoned date parts for timezone ${timeZone}`);
  }

  const weekdayShort = (lookup.weekday || "").toLowerCase().slice(0, 3);
  const weekday = weekdayByShort[weekdayShort];

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday,
  };
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const zoned = getZonedParts(date, timeZone, false);
  const utcEquivalent = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
    0,
  );
  return utcEquivalent - date.getTime();
};

const zonedDateTimeToUtc = (
  civil: CivilDate,
  timeZone: string,
  time: { hour?: number; minute?: number; second?: number } = {},
) => {
  const hour = time.hour ?? 0;
  const minute = time.minute ?? 0;
  const second = time.second ?? 0;

  let guess = Date.UTC(civil.year, civil.month - 1, civil.day, hour, minute, second, 0);

  for (let i = 0; i < 5; i += 1) {
    const offset = getTimeZoneOffsetMs(new Date(guess), timeZone);
    const adjusted =
      Date.UTC(civil.year, civil.month - 1, civil.day, hour, minute, second, 0) - offset;

    if (adjusted === guess) {
      break;
    }

    guess = adjusted;
  }

  return new Date(guess);
};

const shiftCivilDate = (
  civil: CivilDate,
  unit: "day" | "month" | "year",
  delta: number,
): CivilDate => {
  const date = new Date(Date.UTC(civil.year, civil.month - 1, civil.day, 12, 0, 0, 0));

  if (unit === "day") {
    date.setUTCDate(date.getUTCDate() + delta);
  } else if (unit === "month") {
    date.setUTCMonth(date.getUTCMonth() + delta, 1);
  } else {
    date.setUTCFullYear(date.getUTCFullYear() + delta, 0, 1);
  }

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

export const getCurrentPeriodBounds = (
  cadence: AffiliateCompetitionCadence,
  now: Date = new Date(),
  timeZone = "UTC",
) => {
  const zonedNow = getZonedParts(now, timeZone, true);
  const today: CivilDate = {
    year: zonedNow.year,
    month: zonedNow.month,
    day: zonedNow.day,
  };

  if (cadence === "daily") {
    const startAt = zonedDateTimeToUtc(today, timeZone);
    const endAt = zonedDateTimeToUtc(shiftCivilDate(today, "day", 1), timeZone);
    return { startAt, endAt, timeZone };
  }

  if (cadence === "weekly") {
    const dayOfWeek = Number.isFinite(zonedNow.weekday) ? zonedNow.weekday : 0;
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    const startCivil = shiftCivilDate(today, "day", -daysSinceMonday);
    const startAt = zonedDateTimeToUtc(startCivil, timeZone);
    const endAt = zonedDateTimeToUtc(shiftCivilDate(startCivil, "day", 7), timeZone);
    return { startAt, endAt, timeZone };
  }

  if (cadence === "monthly") {
    const startCivil = { year: today.year, month: today.month, day: 1 };
    const startAt = zonedDateTimeToUtc(startCivil, timeZone);
    const endAt = zonedDateTimeToUtc(shiftCivilDate(startCivil, "month", 1), timeZone);
    return { startAt, endAt, timeZone };
  }

  const startCivil = { year: today.year, month: 1, day: 1 };
  const startAt = zonedDateTimeToUtc(startCivil, timeZone);
  const endAt = zonedDateTimeToUtc(shiftCivilDate(startCivil, "year", 1), timeZone);
  return { startAt, endAt, timeZone };
};
