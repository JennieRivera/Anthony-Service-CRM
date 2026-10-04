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

// Per-key (intended: per-owner-email) request budget. In-memory only —
// see checkRateLimit()'s own comment for why that's an accepted,
// documented limitation at this conservative, single-user stage, not an
// oversight.
export const RATE_LIMIT_MAX_REQUESTS = 20;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

// In-memory, per-process sliding-window limiter. Deliberately NOT
// backed by a new database table (no schema change is justified for a
// conservative, single-super_admin-user initial limit) — this resets on
// server restart and does not coordinate across multiple serverless
// instances. That's an accepted, documented limitation for this
// foundation step, not a production-scale guarantee; revisit with a
// durable store if/when MIADIAMANTE access broadens beyond one user.
const requestLog = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  now: number = Date.now(),
): RateLimitResult {
  const existing = requestLog.get(key) ?? [];
  const withinWindow = existing.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (withinWindow.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(key, withinWindow);
    return { allowed: false, remaining: 0 };
  }

  withinWindow.push(now);
  requestLog.set(key, withinWindow);
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - withinWindow.length };
}

// Exposed only so tests can reset state between checks — never meant to
// be called from application code.
export function __resetRateLimitForTests(): void {
  requestLog.clear();
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
