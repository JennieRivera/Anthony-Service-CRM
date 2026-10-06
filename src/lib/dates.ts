// Anthony Multiservice operates out of Kissimmee, FL — every date/time the
// CRM shows or stores "as of now" must use this timezone, not whatever
// timezone the server process or the viewer's browser happens to be in.
// Vercel's Node runtime defaults to UTC, which previously caused appointment
// times to be stored ~4-5 hours off (wall-clock EDT/EST misread as UTC on
// write) and displayed inconsistently between server-render and the
// browser's own local time (causing hydration mismatches on read).
export const BUSINESS_TIME_ZONE = "America/New_York";

type DateInput = Date | string | number;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function formatDate(
  value: DateInput | null | undefined = new Date(),
  locale?: string,
): string {
  if (value == null) return "—";
  // A date-only value ("2026-10-01", a Postgres `date` column) is already a
  // calendar date: show it as-is. new Date("2026-10-01") is midnight UTC,
  // which in Florida is still the evening of Sept 30 — one day early.
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { timeZone: "UTC" });
  }
  return new Date(value).toLocaleDateString(locale, {
    timeZone: BUSINESS_TIME_ZONE,
  });
}

export function formatDateTime(
  value: DateInput | null | undefined = new Date(),
  locale?: string,
): string {
  if (value == null) return "—";
  return new Date(value).toLocaleString(locale, {
    timeZone: BUSINESS_TIME_ZONE,
  });
}

export function formatTime(
  value: DateInput | null | undefined = new Date(),
  locale?: string,
): string {
  if (value == null) return "—";
  return new Date(value).toLocaleTimeString(locale, {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Today's (or any instant's) calendar date as "YYYY-MM-DD" in the business's
 * own timezone — use this anywhere a "today" or "local date" column is
 * derived from `new Date()`, instead of `new Date().toISOString().slice(0, 10)`,
 * which gives the UTC calendar date and is wrong for several hours a day.
 */
export function businessDateString(value: DateInput = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value])) as Record<
    string,
    string
  >;
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

/**
 * Calendar arithmetic on a "YYYY-MM-DD" date: addDays("2026-10-31", 1) is
 * "2026-11-01". Pure date math (no time of day, no DST), so the result is
 * the same in every timezone.
 */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function timeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value])) as Record<
    string,
    string
  >;
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second),
  );
  return (asUtc - date.getTime()) / 60000;
}

/**
 * Interprets a naive "YYYY-MM-DDTHH:mm" string (e.g. straight from a
 * `<input type="datetime-local">`, with no UTC offset of its own) as
 * wall-clock time in the business's timezone and returns the matching UTC
 * instant — correctly handling the EDT/EST switch. Without this, a server
 * action running in a UTC process reads that same string as if it were
 * already UTC and silently shifts every appointment by 4-5 hours.
 */
export function businessLocalToUtc(
  naiveDateTime: string,
  timeZone: string = BUSINESS_TIME_ZONE,
): Date {
  const [datePart, timePart = "00:00"] = naiveDateTime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetMinutes = timeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60000);
}
