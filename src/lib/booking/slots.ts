import { businessDateString, businessLocalToUtc } from "@/lib/dates";
import type { OnlineBookingSettings } from "./config";

// Pure availability math for the public /book page — no database, no
// clock of its own (the caller passes `now`), so it's fully unit-testable
// (see slots.test.ts). Every wall-clock value ("YYYY-MM-DD", "HH:mm") is
// America/New_York business time; every instant is a UTC epoch-ms number.
// Wall-clock → instant conversion always goes through businessLocalToUtc,
// which handles the EDT/EST switch — never `new Date("YYYY-MM-DDTHH:mm")`,
// which a UTC server process would misread (the 4–5 hour bug fixed in
// src/lib/dates.ts).

export type BusyInterval = { startMs: number; endMs: number };

export type DayAvailability = { date: string; slots: string[] };

const MINUTE_MS = 60_000;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHhmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Calendar arithmetic on a "YYYY-MM-DD" date, done in UTC so it is
// independent of the server's own timezone and of DST.
export function addDaysToDateString(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function weekdayOfDateString(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// The bookable dates window: today (business time) through
// today + maxDaysAhead, inclusive.
export function bookingWindowDates(nowMs: number, maxDaysAhead: number): string[] {
  const today = businessDateString(new Date(nowMs));
  return Array.from({ length: maxDaysAhead + 1 }, (_, i) => addDaysToDateString(today, i));
}

export function slotInstant(date: string, time: string, durationMinutes: number) {
  const startMs = businessLocalToUtc(`${date}T${time}`).getTime();
  return { startMs, endMs: startMs + durationMinutes * MINUTE_MS };
}

export function computeDaySlots(params: {
  date: string;
  settings: OnlineBookingSettings;
  durationMinutes: number;
  blockedDates: ReadonlySet<string>;
  busy: readonly BusyInterval[];
  nowMs: number;
}): string[] {
  const { date, settings, durationMinutes, blockedDates, busy, nowMs } = params;
  if (!settings.enabled || blockedDates.has(date)) return [];
  if (!bookingWindowDates(nowMs, settings.maxDaysAhead).includes(date)) return [];

  const hours = settings.weeklyHours[weekdayOfDateString(date)];
  if (!hours) return [];

  const open = toMinutes(hours.start);
  const close = toMinutes(hours.end);
  const step = Math.max(5, settings.slotIntervalMinutes);
  const bufferMs = settings.bufferMinutes * MINUTE_MS;
  const earliestStartMs = nowMs + settings.minNoticeMinutes * MINUTE_MS;

  const slots: string[] = [];
  for (let t = open; t + durationMinutes <= close; t += step) {
    const time = toHhmm(t);
    const { startMs, endMs } = slotInstant(date, time, durationMinutes);
    if (startMs < earliestStartMs) continue;
    // Same overlap rule as the book_online_appointment() Postgres
    // function: the buffer is kept on both sides of every existing
    // appointment.
    const conflicts = busy.some(
      (b) => b.startMs < endMs + bufferMs && b.endMs > startMs - bufferMs,
    );
    if (!conflicts) slots.push(time);
  }
  return slots;
}

export function computeAvailability(params: {
  settings: OnlineBookingSettings;
  durationMinutes: number;
  blockedDates: ReadonlySet<string>;
  busy: readonly BusyInterval[];
  nowMs: number;
}): DayAvailability[] {
  return bookingWindowDates(params.nowMs, params.settings.maxDaysAhead).map((date) => ({
    date,
    slots: computeDaySlots({ ...params, date }),
  }));
}
