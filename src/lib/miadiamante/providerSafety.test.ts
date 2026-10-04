// MIADIAMANTE Phase 2B-3 — provider safety-limit tests.
//
// The constants and trimConversationHistory() below are pure/zero-I/O.
// checkRateLimit() is now DB-backed (Phase 2B-3 durable rate limiter) and
// its tests hit the real, shared Neon database — exactly like
// conversationStore.test.ts already does elsewhere in this module. Every
// test uses a clearly-isolated, randomly-suffixed test identity under the
// reserved .invalid TLD (RFC 2606) that cannot collide with any real AMS
// user, and every test cleans up its own rows in a finally block, with a
// final row-array re-check (never a bare count(*)) confirming zero rows
// remain.

import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  checkRateLimit,
  trimConversationHistory,
  RATE_LIMIT_MAX_REQUESTS,
  MAX_OUTPUT_TOKENS,
  MAX_TOOL_CALLS_PER_TURN,
  MAX_CONVERSATION_HISTORY_MESSAGES,
  PROVIDER_TIMEOUT_MS,
  PROVIDER_MAX_RETRIES,
} from "./providerSafety";

let passed = 0;
let failed = 0;

async function check(label: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok   ${label}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${label}`);
    console.log(`       ${err instanceof Error ? err.message : String(err)}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// A fresh, collision-proof test identity per call — .invalid is reserved
// by RFC 2606 specifically for addresses that must never resolve/exist,
// so this can never collide with a real AMS user's email.
function testEmail(label: string): string {
  return `miadiamante-2b3-ratelimit-${label}-${randomUUID()}@ratelimit-test.invalid`;
}

async function deleteEventsFor(...emails: string[]): Promise<void> {
  const db = getDb();
  for (const email of emails) {
    await db.execute(
      sql`DELETE FROM miadiamante_rate_limit_events WHERE owner_email = ${email.toLowerCase()}`,
    );
  }
}

async function countEventsFor(email: string): Promise<number> {
  const db = getDb();
  const result = await db.execute(
    sql`SELECT id FROM miadiamante_rate_limit_events WHERE owner_email = ${email.toLowerCase()}`,
  );
  const rows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows;
  return rows.length;
}

async function insertRawEventAt(email: string, occurredAt: Date): Promise<void> {
  const db = getDb();
  await db.execute(
    sql`INSERT INTO miadiamante_rate_limit_events (owner_email, occurred_at) VALUES (${email.toLowerCase()}, ${occurredAt.toISOString()})`,
  );
}

async function main() {
  console.log("Conservative limits — documenting the exact chosen numbers:");

  await check("MAX_OUTPUT_TOKENS is 1024", () => assert(MAX_OUTPUT_TOKENS === 1024, `got ${MAX_OUTPUT_TOKENS}`));
  await check("MAX_TOOL_CALLS_PER_TURN is 3", () => assert(MAX_TOOL_CALLS_PER_TURN === 3, `got ${MAX_TOOL_CALLS_PER_TURN}`));
  await check("MAX_CONVERSATION_HISTORY_MESSAGES is 10", () => assert(MAX_CONVERSATION_HISTORY_MESSAGES === 10, `got ${MAX_CONVERSATION_HISTORY_MESSAGES}`));
  await check("PROVIDER_TIMEOUT_MS is 30000 (30s)", () => assert(PROVIDER_TIMEOUT_MS === 30_000, `got ${PROVIDER_TIMEOUT_MS}`));
  await check("PROVIDER_MAX_RETRIES is 1 (lower than the AI SDK's own default of 2)", () => assert(PROVIDER_MAX_RETRIES === 1, `got ${PROVIDER_MAX_RETRIES}`));
  await check("RATE_LIMIT_MAX_REQUESTS is 20 per hour", () => assert(RATE_LIMIT_MAX_REQUESTS === 20, `got ${RATE_LIMIT_MAX_REQUESTS}`));

  console.log(
    "\ncheckRateLimit() — durable, DB-backed rolling window (real queries against the shared Neon database, isolated test identities, explicit cleanup):",
  );

  await check("allows requests up to the limit, then denies the next one — sequential, single identity", async () => {
    const email = testEmail("sequential");
    try {
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        const result = await checkRateLimit(email);
        assert(result.allowed, `expected request ${i + 1} to be allowed`);
      }
      const overLimit = await checkRateLimit(email);
      assert(!overLimit.allowed, "expected the request past the limit to be denied");
      const stored = await countEventsFor(email);
      assert(stored === RATE_LIMIT_MAX_REQUESTS, `expected exactly ${RATE_LIMIT_MAX_REQUESTS} stored events (the denied call must not insert), got ${stored}`);
    } finally {
      await deleteEventsFor(email);
      const remaining = await countEventsFor(email);
      assert(remaining === 0, "cleanup failed: rows remain for the sequential test identity");
    }
  });

  await check("different owners are tracked independently", async () => {
    const ownerA = testEmail("owner-a");
    const ownerB = testEmail("owner-b");
    try {
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        await checkRateLimit(ownerA);
      }
      const ownerADenied = await checkRateLimit(ownerA);
      const ownerBAllowed = await checkRateLimit(ownerB);
      assert(!ownerADenied.allowed, "expected owner-a to be rate-limited");
      assert(ownerBAllowed.allowed, "expected owner-b to be unaffected by owner-a's usage");
    } finally {
      await deleteEventsFor(ownerA, ownerB);
      assert((await countEventsFor(ownerA)) === 0 && (await countEventsFor(ownerB)) === 0, "cleanup failed: rows remain for the multi-owner test identities");
    }
  });

  await check("true rolling window: events older than 1 hour don't count against the limit", async () => {
    const email = testEmail("rolling-window");
    try {
      // Simulate a real event from 2 hours ago, outside the 1-hour
      // window, inserted directly (not via checkRateLimit, which always
      // stamps the current time) so it pre-exists before any check.
      await insertRawEventAt(email, new Date(Date.now() - 2 * 60 * 60 * 1000));
      // All 20 of the *current* window's requests must still be allowed
      // — the old row must not count toward the limit.
      for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
        const result = await checkRateLimit(email);
        assert(result.allowed, `expected request ${i + 1} to be allowed despite the pre-existing old event`);
      }
      const overLimit = await checkRateLimit(email);
      assert(!overLimit.allowed, "expected the 21st CURRENT-window request to be denied");
      // 1 old row + 20 fresh rows = 21 stored, confirming the old row
      // was never deleted, merely excluded from the count.
      const stored = await countEventsFor(email);
      assert(stored === RATE_LIMIT_MAX_REQUESTS + 1, `expected ${RATE_LIMIT_MAX_REQUESTS + 1} stored rows (1 old + 20 fresh), got ${stored}`);
    } finally {
      await deleteEventsFor(email);
      assert((await countEventsFor(email)) === 0, "cleanup failed: rows remain for the rolling-window test identity");
    }
  });

  await check(
    "CRITICAL CONCURRENCY TEST: 25 concurrent requests for one identity against the real shared database yield exactly 20 allowed and 5 denied — proves the advisory-lock serialization actually prevents the race, not just the sequential-await case above",
    async () => {
      const email = testEmail("concurrency-25");
      try {
        const CONCURRENT_REQUESTS = 25;
        const results = await Promise.all(
          Array.from({ length: CONCURRENT_REQUESTS }, () => checkRateLimit(email)),
        );
        const allowedCount = results.filter((r) => r.allowed).length;
        const deniedCount = results.filter((r) => !r.allowed).length;
        assert(
          allowedCount === RATE_LIMIT_MAX_REQUESTS,
          `expected exactly ${RATE_LIMIT_MAX_REQUESTS} allowed under 25 true concurrent requests, got ${allowedCount}`,
        );
        assert(
          deniedCount === CONCURRENT_REQUESTS - RATE_LIMIT_MAX_REQUESTS,
          `expected exactly ${CONCURRENT_REQUESTS - RATE_LIMIT_MAX_REQUESTS} denied, got ${deniedCount}`,
        );
        const stored = await countEventsFor(email);
        assert(
          stored === RATE_LIMIT_MAX_REQUESTS,
          `expected exactly ${RATE_LIMIT_MAX_REQUESTS} rows actually inserted (no over-insertion past the limit under concurrency), got ${stored}`,
        );
      } finally {
        await deleteEventsFor(email);
        const remaining = await countEventsFor(email);
        assert(remaining === 0, "cleanup failed: rows remain for the 25-concurrent-request test identity");
      }
    },
  );

  const source = fs.readFileSync(path.join(__dirname, "providerSafety.ts"), "utf-8");

  console.log("\nSource-text checks (fail-closed behavior and transaction-mechanism documentation):");

  await check("checkRateLimit wraps its entire DB operation in try/catch and the catch branch returns { allowed: false } — fail-closed, never a fallback to any other limiter", () => {
    const fnMatch = source.match(/export async function checkRateLimit\([\s\S]*?\n}/);
    assert(!!fnMatch, "expected to find checkRateLimit's body");
    const body = fnMatch![0];
    const tryIndex = body.indexOf("try {");
    const catchIndex = body.indexOf("} catch {");
    const allowedFalseIndex = body.indexOf("{ allowed: false }", catchIndex);
    assert(tryIndex !== -1, "expected a try block wrapping the DB operation");
    assert(catchIndex !== -1 && catchIndex > tryIndex, "expected a catch block after the try block");
    assert(allowedFalseIndex !== -1 && allowedFalseIndex > catchIndex, "expected the catch branch to return { allowed: false }");
  });

  await check("no in-memory Map-based fallback remains anywhere in the file", () => {
    assert(!source.includes("new Map"), "expected zero remaining in-memory Map-based limiter state");
    assert(!source.includes("__resetRateLimitForTests"), "expected the in-memory-only test-reset helper to be removed (no longer meaningful against a real DB)");
  });

  await check("does not call db.transaction() (unsupported by this project's neon-http driver) — atomicity comes from the miadiamante_check_rate_limit() PL/pgSQL function instead", () => {
    const nonCommentSource = source
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    assert(!nonCommentSource.includes("db.transaction("), "expected zero calls to db.transaction(), which throws on neon-http");
    assert(source.includes("miadiamante_check_rate_limit"), "expected checkRateLimit to call the DB-side function");
  });

  console.log("\ntrimConversationHistory() — bounded replay:");

  await check("returns all messages when under the limit", () => {
    const messages = [1, 2, 3];
    const trimmed = trimConversationHistory(messages, 10);
    assert(trimmed.length === 3, "expected all 3 messages returned");
  });

  await check("returns only the most recent N messages when over the limit, preserving order", () => {
    const messages = Array.from({ length: 25 }, (_, i) => i);
    const trimmed = trimConversationHistory(messages, 10);
    assert(trimmed.length === 10, `expected 10 messages, got ${trimmed.length}`);
    assert(trimmed[0] === 15 && trimmed[9] === 24, "expected the LAST 10 messages (15..24), oldest-first order preserved");
  });

  await check("defaults to MAX_CONVERSATION_HISTORY_MESSAGES when no limit is passed", () => {
    const messages = Array.from({ length: 25 }, (_, i) => i);
    const trimmed = trimConversationHistory(messages);
    assert(trimmed.length === MAX_CONVERSATION_HISTORY_MESSAGES, `expected ${MAX_CONVERSATION_HISTORY_MESSAGES}, got ${trimmed.length}`);
  });

  console.log(`\n${passed} checks passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
