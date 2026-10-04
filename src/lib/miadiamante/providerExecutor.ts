// MIADIAMANTE AI Foundation — Phase 2B-3 rate limiter wiring. THE ONE
// server-side choke point for future MIADIAMANTE provider execution.
//
// This file establishes ONLY the safe provider-execution gate (owner
// decision, Phase 2B-3 rate-limiter-wiring approval). It deliberately
// does NOT:
// - map a provider response into a ModelTurnProposal / ToolCallProposal[]
//   (structured tool-calling mapping is explicitly out of scope here —
//   a separate, future, explicitly-approved step),
// - call runConversationTurn() or any other conversationController.ts
//   export (conversationController.ts remains entirely unaware of this
//   file and of the provider — unchanged),
// - persist anything (conversationStore.ts is a separate, unmodified-
//   in-this-step concern; composing this with persistence is a future
//   caller's job, exactly like conversationStore.ts's own comment about
//   "a future caller (Phase 2B-4) ... compose the two" already
//   anticipated).
//
// WHY THIS FILE EXISTS, NOT A CHANGE TO AN EXISTING ONE (Phase 2B-3
// wiring-design audit): no existing file was the right home.
// - provider.ts MUST remain transport-only (zero imports of
//   capabilityRunner/authorize/conversationController/getDb/schema —
//   enforced by its own existing regression test). Importing
//   checkRateLimit (which imports getDb) into provider.ts would break
//   that invariant.
// - conversationController.ts's runConversationTurn() only ever executes
//   an ALREADY-PRODUCED proposal; it never calls the provider itself,
//   so there is no call site inside it to wrap.
// - conversationStore.ts is pure persistence/ownership with no
//   knowledge of the provider, by explicit design.
// This file is the only one that imports BOTH authorize.ts's identity
// helper, providerSafety.ts's rate limiter, AND provider.ts's adapter —
// composing them in the fixed order below, and nothing else in the
// codebase is allowed to call provider.generate() directly.
//
// EXECUTION ORDER (owner-approved, fixed):
//   authenticated session
//   -> MIADIAMANTE Layer 1 authorization
//   -> server-derived owner email
//   -> durable checkRateLimit(ownerEmail)
//   -> provider.generate(...)
//        -> existing sensitive-data guard (unchanged, inside provider.ts)
//        -> future provider network request
// No provider.generate() call can occur before both authorization and
// rate-limit approval — each is a hard early return.
//
// SPOOFING PROTECTION: the production export, runMiadiamanteProviderRequest(),
// takes EXACTLY ONE parameter — a MiadiamanteModelRequest (capability +
// authorizedData + userMessage — the exact, existing, unmodified
// provider.ts request shape). There is no owner_email, role, rate-
// limit-identity, max_requests, window_ms, OR dependency-override
// parameter anywhere in its signature, so there is structurally no
// input path — for a production caller OR a test — to supply or
// override identity, the rate limiter, or the provider through the
// production export. Identity is ALWAYS resolved fresh, server-side,
// via getMiadiamanteAuthorizedSessionEmail(), built inline into the one
// call to the private executeProviderRequest() helper below.
// checkRateLimit() itself takes only the resolved email;
// RATE_LIMIT_MAX_REQUESTS and RATE_LIMIT_WINDOW_MS are providerSafety.ts's
// own internal constants, never parameters, so the 20-requests/rolling-
// 1-hour policy cannot be overridden from here either.
//
// HARDENING (post-implementation-review correction): an earlier version
// of this file put the dependency-injection seam directly on
// runMiadiamanteProviderRequest() itself (an optional `deps` parameter
// defaulting to the real implementations). That mirrored
// conversationController.ts's own `toolRunners` pattern, but the risk
// profile is NOT the same: conversationController.ts's override lets a
// test substitute which functions execute an ALREADY-AUTHORIZED tool
// call (authorization still lives deeper, inside capabilityRunner.ts,
// untouched by the override). Here, the "dependencies" ARE the
// identity/rate-limit/provider-selection seams THIS FILE EXISTS to make
// non-bypassable — even with the parameter defaulting to the real
// implementations, its mere presence meant any caller (not just a test)
// could technically supply `{ resolveOwnerEmail: () => "attacker@x" }`
// and bypass every guarantee this file makes. Fixed by moving the
// seam into a private, unexported helper (executeProviderRequest) and
// giving it to tests ONLY via a double-underscore, explicitly
// test-only export (see __executeProviderRequestForTests below) —
// matching this module's own established "exported only so tests can
// reach internal state, never meant for production use" convention
// (providerSafety.ts's prior __resetRateLimitForTests). The production
// export now has exactly one parameter, full stop.
//
// NEUTRAL DENIAL (owner requirement): every denial branch below —
// unauthenticated/unauthorized (Layer 1), rate-limit exceeded, rate-limit
// infrastructure failure (checkRateLimit's own fail-closed catch, which
// already collapses "quota exceeded" and "DB/lock/count/insert failure"
// into the identical { allowed: false } shape before this file ever
// sees it), and a provider-call failure (including
// SensitiveDataBlockedError, and today's expected "no
// AI_GATEWAY_API_KEY configured" error) — ALL return the exact same
// NEUTRAL_UNAVAILABLE_MESSAGE, reused verbatim, never a second copy.
// Nothing here exposes remaining quota, DB state, which layer denied,
// or any internal error's message/stack to the caller.
//
// QUOTA SEMANTICS: exactly one checkRateLimit() call happens per
// runMiadiamanteProviderRequest() invocation (one call site, one
// `await checkRateLimit(...)` statement, no loop, no retry). Tool-only/
// capability-only execution (conversationController.ts /
// capabilityRunner.ts) never imports this file or providerSafety.ts's
// checkRateLimit at all, so it is structurally impossible for a pure
// tool call to consume provider quota.

import {
  getMiadiamanteAuthorizedSessionEmail,
} from "./authorize";
import { checkRateLimit, type RateLimitResult } from "./providerSafety";
import {
  getMiadiamanteModelProvider,
  type MiadiamanteModelProvider,
  type MiadiamanteModelRequest,
  type MiadiamanteModelResponse,
} from "./provider";
import { NEUTRAL_UNAVAILABLE_MESSAGE } from "./capabilityRunner";

export { NEUTRAL_UNAVAILABLE_MESSAGE };

export type ProviderExecutionResult =
  | { allowed: true; response: MiadiamanteModelResponse }
  | { allowed: false; message: string };

// Internal-only shape, never exported. All three fields are REQUIRED
// (no `?`, no defaulting) — the one production call site below always
// builds a complete object from the real implementations; the
// test-only export always requires the caller to supply a complete
// object explicitly. There is no partial-override path anywhere.
interface ProviderExecutorDeps {
  resolveOwnerEmail: () => Promise<string | null>;
  checkRateLimit: (ownerEmail: string) => Promise<RateLimitResult>;
  getProvider: () => MiadiamanteModelProvider;
}

// PRIVATE core. Never exported to a production caller under its real
// name — see runMiadiamanteProviderRequest() (the only production
// entry point, one parameter, builds `deps` inline from the real
// implementations every time) and __executeProviderRequestForTests
// (the only way a test reaches this with substituted dependencies).
async function executeProviderRequest(
  request: MiadiamanteModelRequest,
  deps: ProviderExecutorDeps,
): Promise<ProviderExecutionResult> {
  // The ENTIRE flow below is one try/catch, deliberately: this function
  // must never throw. Every exit is either { allowed: true, response }
  // or { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE } — never
  // a raw exception reaching this function's caller. The real
  // checkRateLimit() already fails closed internally (see
  // providerSafety.ts's own try/catch), so this outer catch is defense
  // in depth, not the primary mechanism — but it means even an
  // unexpected throw from identity resolution or the rate-limit call
  // itself collapses into the exact same neutral denial as a normal
  // "not allowed" result, never leaking an error message/stack to the
  // caller.
  try {
    // Authenticated session + MIADIAMANTE Layer 1 authorization +
    // server-derived owner email, all in one step (see
    // getMiadiamanteAuthorizedSessionEmail() in authorize.ts). `request`
    // carries no identity field, so there is nothing here for a caller
    // to override.
    const ownerEmail = await deps.resolveOwnerEmail();
    if (!ownerEmail) {
      return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
    }

    // Durable, fail-closed rate limit — exactly ONE call, before any
    // provider/network code runs. Fixed server-side policy (20
    // requests, rolling 1 hour) lives entirely inside providerSafety.ts;
    // nothing is passed from here that could change it.
    const rateLimitResult = await deps.checkRateLimit(ownerEmail);
    if (!rateLimitResult.allowed) {
      return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
    }

    // provider.generate() runs its OWN unchanged sensitive-data guard
    // before any network call — a rate-limit pass never bypasses it.
    // getMiadiamanteModelProvider() itself still throws today (no
    // AI_GATEWAY_API_KEY configured anywhere — Phase 2B-3 foundation
    // only, no activation in this step); that, and any future real
    // provider error (including a sensitive-data block), is caught by
    // this same outer catch and collapsed into the same neutral denial.
    const provider = deps.getProvider();
    const response = await provider.generate(request);
    return { allowed: true, response };
  } catch {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE };
  }
}

// THE single production-facing export. Exactly ONE parameter — no
// dependency-override parameter exists on this function's signature at
// all, so there is structurally no way for any caller, production or
// test, to supply an alternate identity resolver, rate limiter, or
// provider through it. It always builds a complete, real `deps` object
// inline and calls the private helper above — there is no default to
// fall back from, because there is nothing else to pass.
export async function runMiadiamanteProviderRequest(
  request: MiadiamanteModelRequest,
): Promise<ProviderExecutionResult> {
  return executeProviderRequest(request, {
    resolveOwnerEmail: getMiadiamanteAuthorizedSessionEmail,
    checkRateLimit,
    getProvider: getMiadiamanteModelProvider,
  });
}

// Exported ONLY for providerExecutor.test.ts — confirmed by a
// source-text check in that same file that no production path
// (provider.ts, providerSafety.ts, conversationController.ts,
// capabilityRunner.ts, conversationStore.ts) ever imports this name.
// This is NOT a second public executor: it is the one, explicit,
// double-underscore-named escape hatch tests use to supply fakes for
// the identity resolver / rate limiter / provider, exactly mirroring
// providerSafety.ts's prior __resetRateLimitForTests precedent. A
// caller importing this in production code would be bypassing an
// extremely obvious naming and documentation convention, not
// discovering an accidental alternate API.
export const __executeProviderRequestForTests = executeProviderRequest;
