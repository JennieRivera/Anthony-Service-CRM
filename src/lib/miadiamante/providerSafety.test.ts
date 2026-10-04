// MIADIAMANTE Phase 2B-3 — provider safety-limit tests. Pure/zero-I/O —
// the rate limiter is in-memory, no database or session needed.

import {
  checkRateLimit,
  __resetRateLimitForTests,
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

async function main() {
  console.log("Conservative limits — documenting the exact chosen numbers:");

  await check("MAX_OUTPUT_TOKENS is 1024", () => assert(MAX_OUTPUT_TOKENS === 1024, `got ${MAX_OUTPUT_TOKENS}`));
  await check("MAX_TOOL_CALLS_PER_TURN is 3", () => assert(MAX_TOOL_CALLS_PER_TURN === 3, `got ${MAX_TOOL_CALLS_PER_TURN}`));
  await check("MAX_CONVERSATION_HISTORY_MESSAGES is 10", () => assert(MAX_CONVERSATION_HISTORY_MESSAGES === 10, `got ${MAX_CONVERSATION_HISTORY_MESSAGES}`));
  await check("PROVIDER_TIMEOUT_MS is 30000 (30s)", () => assert(PROVIDER_TIMEOUT_MS === 30_000, `got ${PROVIDER_TIMEOUT_MS}`));
  await check("PROVIDER_MAX_RETRIES is 1 (lower than the AI SDK's own default of 2)", () => assert(PROVIDER_MAX_RETRIES === 1, `got ${PROVIDER_MAX_RETRIES}`));
  await check("RATE_LIMIT_MAX_REQUESTS is 20 per hour", () => assert(RATE_LIMIT_MAX_REQUESTS === 20, `got ${RATE_LIMIT_MAX_REQUESTS}`));

  console.log("\ncheckRateLimit() — in-memory sliding window:");

  await check("allows requests up to the limit, then denies the next one", () => {
    __resetRateLimitForTests();
    const key = "owner@anthonyservice.com";
    let lastResult;
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      lastResult = checkRateLimit(key);
      assert(lastResult.allowed, `expected request ${i + 1} to be allowed`);
    }
    const overLimit = checkRateLimit(key);
    assert(!overLimit.allowed, "expected the request past the limit to be denied");
  });

  await check("remaining count decreases correctly", () => {
    __resetRateLimitForTests();
    const key = "owner@anthonyservice.com";
    const first = checkRateLimit(key);
    assert(first.remaining === RATE_LIMIT_MAX_REQUESTS - 1, `expected ${RATE_LIMIT_MAX_REQUESTS - 1} remaining, got ${first.remaining}`);
  });

  await check("different keys are tracked independently", () => {
    __resetRateLimitForTests();
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit("owner-a@anthonyservice.com");
    }
    const ownerADenied = checkRateLimit("owner-a@anthonyservice.com");
    const ownerBAllowed = checkRateLimit("owner-b@anthonyservice.com");
    assert(!ownerADenied.allowed, "expected owner-a to be rate-limited");
    assert(ownerBAllowed.allowed, "expected owner-b to be unaffected by owner-a's usage");
  });

  await check("requests outside the time window no longer count against the limit", () => {
    __resetRateLimitForTests();
    const key = "owner@anthonyservice.com";
    const longAgo = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago, outside the 1-hour window
    for (let i = 0; i < RATE_LIMIT_MAX_REQUESTS; i++) {
      checkRateLimit(key, longAgo);
    }
    const now = checkRateLimit(key, Date.now());
    assert(now.allowed, "expected the old requests to have expired out of the window");
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
