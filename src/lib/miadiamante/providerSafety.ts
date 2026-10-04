// MIADIAMANTE AI Foundation — Phase 2B-3 provider foundation. Single
// source of truth for every application-level cost/safety limit, kept
// separate from provider.ts so the exact chosen numbers are easy to find
// and adjust in one place without touching adapter logic.
//
// These are CONSERVATIVE INITIAL values, chosen for a single super_admin
// user (Layer 1 access is super_admin-only as of Phase 2B-2 — "per-user"
// effectively means "total" right now). They work ALONGSIDE, never
// instead of, the Vercel AI Gateway's own $25/month budget enforcement
// (owner-approved, configured in the Vercel dashboard, not in code) —
// these limits exist because the Gateway's dollar budget has no concept
// of per-turn shape (how many tool calls, how much history, etc.).

import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

// Maximum tokens the model may generate in a single response. Keeps a
// single reply bounded and cheap; MIADIAMANTE's existing DTOs are
// already small/aggregate-only, so a long reply is never needed to
// faithfully summarize one.
export const MAX_OUTPUT_TOKENS = 1024;

// Maximum tool calls executed from a single proposed turn. Enforced in
// conversationController.ts's runConversationTurn() by truncating
// proposal.toolCalls before executing — a safety cap on BREADTH, never a
// substitute for each individual call's own authorization (every
// executed call still passes through the real TOOL_RUNNERS/Zod/
// authorization chain unchanged).
export const MAX_TOOL_CALLS_PER_TURN = 3;

// Maximum prior messages replayed into a turn's context when a future
// caller builds a prompt from conversation history (see
// trimConversationHistory below) — unbounded replay is a real, growing
// cost risk as a conversation gets long.
export const MAX_CONVERSATION_HISTORY_MESSAGES = 10;

// Passed directly as generateText()'s own `timeout` option (AI SDK 7
// supports this as a plain number of milliseconds — confirmed against
// the installed package's own docs, not assumed).
export const PROVIDER_TIMEOUT_MS = 30_000;

// Passed directly as generateText()'s own `maxRetries` option. Lower
// than the SDK's own default of 2 — a conservative choice for an
// initial, budget-capped connection: one bounded retry on a transient
// failure, never unbounded retrying that could itself erode the $25
// monthly ceiling.
export const PROVIDER_MAX_RETRIES = 1;

// Per-owner-email request budget, durably enforced (Phase 2B-3 durable
// rate limiter — see checkRateLimit() below). Replaces the earlier
// in-memory/per-process limiter, which was flagged in review as unsafe
// on Vercel's multi-instance serverless infrastructure (each instance
// would have had its own independent counter).
export const RATE_LIMIT_MAX_REQUESTS = 20;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface RateLimitResult {
  allowed: boolean;
}

// Durable, DB-backed sliding-window rate limiter — append-only event log
// (miadiamante_rate_limit_events), not a counter row, so the window is a
// true rolling hour (count WHERE occurred_at > now() - interval '1
// hour'), not a fixed window that resets on a clock boundary.
//
// IDENTITY: ownerEmail must already be the server-derived, authenticated
// MIADIAMANTE identity (the same value authorizeMiadiamanteAccess() /
// getAuthorizedSessionEmail()'s caller resolves in conversationStore.ts)
// — this function never resolves identity itself and must never receive
// a client-supplied value. Defensively lowercased here anyway, matching
// this codebase's "never trust a single layer" convention (see
// conversationStore.ts's own ownership check, which lowercases both
// sides even though the stored value should already be lowercase).
//
// ATOMICITY — WHY THIS CALLS A POSTGRES FUNCTION, NOT db.transaction()
// AND NOT A RAW MULTI-CTE STATEMENT:
//
// This project's DB client is drizzle-orm/neon-http (confirmed by
// reading src/lib/db/index.ts and this driver's own session.js), whose
// db.transaction() unconditionally throws "No transactions support in
// neon-http driver" — it is not merely limited, it is entirely absent.
//
// A first implementation attempt tried to express "acquire advisory
// lock, count, conditionally insert" as ONE compound SQL statement
// (WITH lock_acquired AS (...), recent_count AS (...) INSERT ... SELECT
// ... WHERE ... RETURNING), reasoning that Postgres runs any single
// statement as its own implicit atomic transaction. That is true for
// atomicity, but WRONG for snapshot freshness: under READ COMMITTED, a
// single statement takes ONE snapshot at the moment it starts, even if
// execution blocks partway through (e.g. waiting on
// pg_advisory_xact_lock inside a CTE). When the lock releases and a
// waiting request resumes, it resumes with the SAME stale snapshot from
// before it blocked, so its count(*) subquery does not see rows other
// requests inserted while it waited. Live testing against the real
// database confirmed this empirically: 25 truly concurrent requests
// against a 20/hour limit allowed 24, then 25 (on a repeat run),
// instead of exactly 20 — a real, reproducible race.
//
// The fix (see drizzle/0060_miadiamante_rate_limit_check_fn.sql) moves
// the lock/count/insert sequence into a PL/pgSQL function. Each SQL
// command INSIDE a function body is its own separate statement to
// Postgres, and under READ COMMITTED (plpgsql's default), each inner
// statement gets its OWN fresh snapshot when it runs — so the count
// taken after the lock call blocks and resumes correctly sees every row
// committed by other callers while this one was waiting. This is still
// exactly ONE HTTP round trip / ONE db.execute() call from here, so it
// doesn't need db.transaction() at all; the atomicity now genuinely
// lives inside the function, not in an illusion of one big statement.
//
// The function itself still has the same two properties that make the
// lock meaningful: pg_advisory_xact_lock is transaction-scoped (held
// for exactly the duration of the calling statement's own implicit
// transaction, released the instant it commits right after the
// function returns), so concurrent requests for the SAME owner_email
// serialize, while different owners (different hashtext() lock keys)
// never block each other.
//
// FAIL CLOSED: any failure at any step (connection, function call,
// lock, count, insert) throws, is caught here, and is treated as
// DENIED. There is no silent fallback to the old in-memory limiter.
export async function checkRateLimit(ownerEmail: string): Promise<RateLimitResult> {
  const normalizedEmail = ownerEmail.toLowerCase();

  try {
    const db = getDb();
    const result = await db.execute(sql`
      SELECT miadiamante_check_rate_limit(
        ${normalizedEmail},
        ${RATE_LIMIT_MAX_REQUESTS},
        ${RATE_LIMIT_WINDOW_MS}
      ) AS allowed
    `);

    const rows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows;
    const allowed = Boolean((rows[0] as { allowed: boolean } | undefined)?.allowed);
    return { allowed };
  } catch {
    // FAIL CLOSED — see comment above. Never fall back to any other
    // allow/deny mechanism on a DB/transaction/lock/count/insert failure.
    return { allowed: false };
  }
}

// Returns at most the last `limit` items, preserving order. Pure,
// provider-agnostic — ready for a future caller to use when assembling
// a turn's prompt from persisted conversation history (conversationStore.ts
// has no knowledge of this; wiring the two together is a future
// integration step, not this foundation phase).
export function trimConversationHistory<T>(
  messages: readonly T[],
  limit: number = MAX_CONVERSATION_HISTORY_MESSAGES,
): T[] {
  if (messages.length <= limit) return [...messages];
  return messages.slice(messages.length - limit);
}
