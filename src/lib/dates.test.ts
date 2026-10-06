// Business-date checks around midnight UTC (8 PM EDT / 7 PM EST in
// Florida), where a UTC-based conversion shows or saves the wrong day.
// Same dependency-free style as the other tests: Node's `assert`, via `tsx`.
// The results must not depend on the machine's own timezone — run it with
// TZ=UTC (like Vercel) and any other TZ and it must pass either way.
//
// Run with:
//   npx tsx src/lib/dates.test.ts

import assert from "node:assert/strict";
import { addDays, businessDateString, formatDate } from "./dates";

// A Postgres `date` value is shown as that same calendar day — never the
// day before (the /tasks bug: due 2026-10-01 was listed as 9/30/2026).
assert.equal(formatDate("2026-10-01", "en-US"), "10/1/2026");
assert.equal(formatDate("2026-01-01", "en-US"), "1/1/2026");
assert.equal(formatDate("2026-10-01", "es"), "1/10/2026");

// A timestamp is shown in Florida time: 2026-10-02 02:30 UTC is still
// Oct 1 at 10:30 PM in Kissimmee (EDT) …
assert.equal(formatDate(new Date("2026-10-02T02:30:00Z"), "en-US"), "10/1/2026");
// … and 2026-01-02 04:59 UTC is Jan 1 at 11:59 PM (EST).
assert.equal(formatDate(new Date("2026-01-02T04:59:00Z"), "en-US"), "1/1/2026");

// "Today" for date fields is the Florida date, not the UTC date.
assert.equal(businessDateString(new Date("2026-10-02T02:30:00Z")), "2026-10-01");
assert.equal(businessDateString(new Date("2026-10-02T04:00:00Z")), "2026-10-02");
assert.equal(businessDateString(new Date("2026-01-02T04:59:00Z")), "2026-01-01");
assert.equal(businessDateString(new Date("2026-01-02T05:00:00Z")), "2026-01-02");

// Postpone math (tomorrow / 3 days / 1 week) across month, year and DST.
assert.equal(addDays("2026-09-30", 1), "2026-10-01");
assert.equal(addDays("2026-10-31", 1), "2026-11-01");
assert.equal(addDays("2026-12-29", 3), "2027-01-01");
assert.equal(addDays("2026-10-30", 7), "2026-11-06"); // DST ends Nov 1
assert.equal(addDays(businessDateString(new Date("2026-10-02T02:30:00Z")), 1), "2026-10-02");

console.log("dates.test.ts: all business-date assertions passed.");
