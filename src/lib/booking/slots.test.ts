// Unit tests for the public /book availability math (src/lib/booking/slots.ts).
// Same dependency-free style as the MIADIAMANTE tests: Node's `assert`,
// run directly via `tsx`. Zero DB access, zero network.
//
// Run with:
//   npx tsx src/lib/booking/slots.test.ts

import assert from "node:assert/strict";
import { DEFAULT_ONLINE_BOOKING_SETTINGS as S } from "./config";
import {
  addDaysToDateString,
  bookingWindowDates,
  computeDaySlots,
  slotInstant,
  weekdayOfDateString,
} from "./slots";

const none = new Set<string>();
// 2026-10-05 is a Monday (EDT, UTC-4). "now" = Sunday 2026-10-04 12:00 EDT.
const NOW = Date.UTC(2026, 9, 4, 16, 0);

// --- calendar helpers ------------------------------------------------------
assert.equal(addDaysToDateString("2026-10-31", 1), "2026-11-01");
assert.equal(addDaysToDateString("2026-12-31", 1), "2027-01-01");
assert.equal(weekdayOfDateString("2026-10-04"), 0); // Sunday
assert.equal(weekdayOfDateString("2026-10-05"), 1); // Monday
assert.equal(weekdayOfDateString("2026-10-10"), 6); // Saturday

// --- timezone: wall-clock 09:00 in Kissimmee, both sides of DST ------------
assert.equal(new Date(slotInstant("2026-10-05", "09:00", 30).startMs).toISOString(), "2026-10-05T13:00:00.000Z"); // EDT
assert.equal(new Date(slotInstant("2026-11-02", "09:00", 30).startMs).toISOString(), "2026-11-02T14:00:00.000Z"); // EST

// --- weekday hours ----------------------------------------------------------
const monday30 = computeDaySlots({ date: "2026-10-05", settings: S, durationMinutes: 30, blockedDates: none, busy: [], nowMs: NOW });
assert.equal(monday30[0], "09:00");
assert.equal(monday30.at(-1), "17:30"); // last 30-min slot ends exactly at 18:00
assert.equal(monday30.length, 18);

const monday60 = computeDaySlots({ date: "2026-10-05", settings: S, durationMinutes: 60, blockedDates: none, busy: [], nowMs: NOW });
assert.equal(monday60.at(-1), "17:00"); // a 60-min appointment can't start at 17:30

const monday45 = computeDaySlots({ date: "2026-10-05", settings: S, durationMinutes: 45, blockedDates: none, busy: [], nowMs: NOW });
assert.equal(monday45.at(-1), "17:00"); // 17:00 + 45 = 17:45 ≤ 18:00; 17:30 + 45 > 18:00

const saturday = computeDaySlots({ date: "2026-10-10", settings: S, durationMinutes: 30, blockedDates: none, busy: [], nowMs: NOW });
assert.deepEqual([saturday[0], saturday.at(-1)], ["09:00", "12:30"]);

assert.deepEqual(computeDaySlots({ date: "2026-10-11", settings: S, durationMinutes: 30, blockedDates: none, busy: [], nowMs: NOW }), []); // Sunday closed

// --- blocked dates and disabled booking -------------------------------------
assert.deepEqual(computeDaySlots({ date: "2026-10-05", settings: S, durationMinutes: 30, blockedDates: new Set(["2026-10-05"]), busy: [], nowMs: NOW }), []);
assert.deepEqual(computeDaySlots({ date: "2026-10-05", settings: { ...S, enabled: false }, durationMinutes: 30, blockedDates: none, busy: [], nowMs: NOW }), []);

// --- minimum notice (2 h) and past times ------------------------------------
// now = Monday 2026-10-05 10:10 EDT → earliest start 12:10 → first slot 12:30.
const mondayMorning = Date.UTC(2026, 9, 5, 14, 10);
const today = computeDaySlots({ date: "2026-10-05", settings: S, durationMinutes: 30, blockedDates: none, busy: [], nowMs: mondayMorning });
assert.equal(today[0], "12:30");
assert.ok(!today.includes("09:00") && !today.includes("12:00"));

// --- booking window: yesterday and > 30 days ahead are never offered ---------
assert.deepEqual(computeDaySlots({ date: "2026-10-02", settings: S, durationMinutes: 30, blockedDates: none, busy: [], nowMs: NOW }), []);
const window = bookingWindowDates(NOW, 30);
assert.equal(window[0], "2026-10-04");
assert.equal(window.at(-1), "2026-11-03");
assert.deepEqual(computeDaySlots({ date: "2026-11-04", settings: S, durationMinutes: 30, blockedDates: none, busy: [], nowMs: NOW }), []);

// --- existing appointment 11:00–12:00 + 15 min buffer on both sides ---------
const busy = [slotInstant("2026-10-05", "11:00", 60)];
const withBusy = computeDaySlots({ date: "2026-10-05", settings: S, durationMinutes: 30, blockedDates: none, busy, nowMs: NOW });
assert.ok(withBusy.includes("10:00")); // 10:00–10:30 ends 30 min before 11:00 (≥ 15 buffer)
assert.ok(!withBusy.includes("10:30")); // ends 11:00, inside the 15-min buffer
assert.ok(!withBusy.includes("11:00") && !withBusy.includes("11:30"));
assert.ok(!withBusy.includes("12:00")); // starts right at 12:00, inside the buffer
assert.ok(withBusy.includes("12:30"));

// --- DST fall-back day (Sunday 2026-11-01) is closed; the Monday after is EST -
const afterDst = computeDaySlots({ date: "2026-11-02", settings: S, durationMinutes: 30, blockedDates: none, busy: [], nowMs: NOW });
assert.equal(afterDst[0], "09:00");
assert.equal(afterDst.length, 18);

console.log("slots.test.ts: all availability assertions passed.");
