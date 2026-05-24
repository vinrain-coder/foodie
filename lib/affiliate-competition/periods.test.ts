import assert from "node:assert/strict";
import { getCurrentPeriodBounds } from "./period-boundaries";

const iso = (date: Date) => date.toISOString();

const utcDaily = getCurrentPeriodBounds(
  "daily",
  new Date("2026-01-15T10:22:00.000Z"),
  "UTC",
);
assert.equal(iso(utcDaily.startAt), "2026-01-15T00:00:00.000Z");
assert.equal(iso(utcDaily.endAt), "2026-01-16T00:00:00.000Z");

const nyDstStartDaily = getCurrentPeriodBounds(
  "daily",
  new Date("2025-03-09T12:00:00.000Z"),
  "America/New_York",
);
assert.equal(iso(nyDstStartDaily.startAt), "2025-03-09T05:00:00.000Z");
assert.equal(iso(nyDstStartDaily.endAt), "2025-03-10T04:00:00.000Z");

const nyWeekly = getCurrentPeriodBounds(
  "weekly",
  new Date("2025-03-12T16:00:00.000Z"),
  "America/New_York",
);
assert.equal(iso(nyWeekly.startAt), "2025-03-10T04:00:00.000Z");
assert.equal(iso(nyWeekly.endAt), "2025-03-17T04:00:00.000Z");

const monthlyNairobi = getCurrentPeriodBounds(
  "monthly",
  new Date("2026-02-20T10:00:00.000Z"),
  "Africa/Nairobi",
);
assert.equal(iso(monthlyNairobi.startAt), "2026-01-31T21:00:00.000Z");
assert.equal(iso(monthlyNairobi.endAt), "2026-02-28T21:00:00.000Z");

console.log("affiliate competition period boundary tests passed");
