// MIADIAMANTE AI Foundation — Phase 1. The single enforcement point every
// future MIADIAMANTE capability call must pass through. Mirrors master
// prompt section 6's formula exactly:
//
//   ALLOW = human_has_access AND ai_has_read_permission
//           AND resource_is_allowed AND requested_operation_is_allowed
//
// Layer 1 (human_has_access) reuses `getCurrentRole()` / `canAccessArea()`
// from src/lib/permissions.ts verbatim — the same, already-enforced human
// RBAC every page and server action in this CRM already depends on. This
// file never re-implements or shadows that logic.
//
// Layer 2 (ai_has_read_permission / resource_is_allowed /
// requested_operation_is_allowed) is new: whether MIADIAMANTE itself is
// permitted to read this capability at all, independent of who is asking.
// This phase has no live `ai_agents` row for MIADIAMANTE (see the Phase 1
// report's identity recommendation) — until one exists, MIADIAMANTE's own
// permission is derived from the capability registry's `implemented` and
// `operationType` fields only: every capability here is read-only, and an
// unimplemented one is refused outright, never silently allowed. This is
// intentionally narrower than the existing agentAuthorization.ts model
// (no canWrite/canSendMessage dimension exists to check, because nothing
// here can write) — see the report for why a future phase should still
// issue MIADIAMANTE a real ai_agents row and reuse
// authorizeAgentAction()'s machinery once write/draft capabilities exist.
//
// ANY failure at ANY layer returns a DENY with a reason that is safe to
// show the caller (never "does a hidden record exist," never a count,
// never a name) — see master prompt section 14 (no side-channel leakage).

import { auth } from "@/auth";
import { getCurrentRole, canAccessArea, type Role } from "@/lib/permissions";
import { CAPABILITY_REGISTRY, type MiadiamanteCapability } from "./capabilities";

export type MiadiamanteDenialReason =
  | "unauthenticated"
  | "unknown_capability"
  | "capability_not_implemented"
  | "human_rbac_denied"
  | "ai_permission_denied";

export type MiadiamanteAuthorizationResult =
  | {
      allowed: true;
      role: Role;
      capability: MiadiamanteCapability;
    }
  | {
      allowed: false;
      role: Role | null;
      reason: MiadiamanteDenialReason;
      // A neutral, user-safe message only — see sanitizeDenialMessage below.
      message: string;
    };

// Fixed, neutral copy per denial reason. Never interpolates the
// capability name, role, or any record identifier into the user-facing
// message — section 14's "no side-channel leakage" requirement means the
// SAME message must be returned whether the capability doesn't exist,
// the human lacks access, or MIADIAMANTE itself isn't permitted to read
// it, except for the authentication case (which is not a leak — anyone
// signed out already knows they're signed out).
const DENIAL_MESSAGES: Record<MiadiamanteDenialReason, string> = {
  unauthenticated: "You need to be signed in to use MIADIAMANTE.",
  unknown_capability: "MIADIAMANTE can't help with that yet.",
  capability_not_implemented: "MIADIAMANTE can't help with that yet.",
  human_rbac_denied: "MIADIAMANTE can't help with that yet.",
  ai_permission_denied: "MIADIAMANTE can't help with that yet.",
};

function deny(reason: MiadiamanteDenialReason, role: Role | null): MiadiamanteAuthorizationResult {
  return { allowed: false, role, reason, message: DENIAL_MESSAGES[reason] };
}

// Pure decision core — no I/O, no session, no database. Takes an
// already-resolved role (or null for "not signed in") and makes the same
// four-layer ALLOW/DENY decision authorizeMiadiamanteRead() exposes.
// Split out specifically so the test matrix (master prompt section 31)
// can exercise every role against every capability with static fixtures,
// per section 32's "prefer pure-function tests ... static authorization
// fixtures" instruction, with zero database access.
export function decideMiadiamanteRead(
  role: Role | null,
  capabilityName: string,
): MiadiamanteAuthorizationResult {
  // Layer 0: must resolve to a real, active, signed-in staff member.
  if (!role) {
    return deny("unauthenticated", null);
  }

  const capability = CAPABILITY_REGISTRY[capabilityName];
  if (!capability) {
    return deny("unknown_capability", role);
  }

  // Layer 2a: resource_is_allowed / requested_operation_is_allowed —
  // MIADIAMANTE has no permission to perform a capability that isn't
  // built and reviewed yet, regardless of the human's own access.
  if (!("implemented" in capability) || !(capability as { implemented?: boolean }).implemented) {
    return deny("capability_not_implemented", role);
  }

  // Layer 1: human_has_access. A capability with a compositeVisibilityCheck
  // (e.g. financial_report_summary.read mirroring the Reports page's own
  // composed getReportsVisibility().any gate — see capabilities.ts) uses
  // that instead of a single AccessArea. Otherwise, a capability with no
  // requiredAccessArea is available to any authenticated role
  // (identity/navigation/tasks/appointments — see capabilities.ts for why
  // each is ungated, by audit, not assumption).
  if (capability.compositeVisibilityCheck) {
    if (!capability.compositeVisibilityCheck(role)) {
      return deny("human_rbac_denied", role);
    }
  } else if (capability.requiredAccessArea !== null && !canAccessArea(role, capability.requiredAccessArea)) {
    return deny("human_rbac_denied", role);
  }

  // Layer 2b: ai_has_read_permission. Every capability in the registry is
  // operationType "read" by construction (see capabilities.ts — no
  // write/draft/protected capability exists in this phase), so this is a
  // defensive check against a future registry entry being added with a
  // different operation type before its own enforcement path exists,
  // not a reachable branch today.
  if (capability.operationType !== "read") {
    return deny("ai_permission_denied", role);
  }

  return { allowed: true, role, capability };
}

// The one function every future MIADIAMANTE capability executor calls
// before touching any data. Server-side only (reads the session via
// getCurrentRole(), same as every other RBAC check in this codebase) —
// never callable from, or trusted from, the browser. A thin I/O wrapper
// around decideMiadiamanteRead() — all the actual decision logic lives
// there so it can be tested without a session.
export async function authorizeMiadiamanteRead(
  capabilityName: string,
): Promise<MiadiamanteAuthorizationResult> {
  // Identical resolution path (and identical fail-safe null-on-any-error
  // behavior) as every other permission check in this CRM.
  const role = await getCurrentRole();
  return decideMiadiamanteRead(role, capabilityName);
}

// --- Layer 1: "may this human use MIADIAMANTE at all?" ------------------
// MIADIAMANTE Phase 2B-2 access hardening (owner decision). This is
// evaluated BEFORE and INDEPENDENTLY of any specific capability — it is
// not a replacement for decideMiadiamanteRead() above (Layer 2, "which
// individual capability may run"), it is the gate conversation
// creation/use checks, which decideMiadiamanteRead() was never designed
// for (its own capabilities, e.g. current_user_context.read, are
// intentionally ungated for every active role, matching their real-page
// equivalents elsewhere in the CRM — reusing one of them as a general
// "may use MIADIAMANTE" check would have allowed every active role,
// which is exactly what this owner decision overrides).
//
// Conservative initial release policy: super_admin only. Expected to
// broaden to additional roles later via a SEPARATELY APPROVED RBAC
// change — when that happens, this is the one function to update; no
// other part of the MIADIAMANTE stack (capability-level authorization,
// conversation ownership) needs to change.
//
// Why a direct role check here, not a new AccessArea in permissions.ts:
// super_admin, admin, and manager are structurally indistinguishable in
// ROLE_PERMISSIONS today — all three resolve to the "*" wildcard, not an
// individual area list — so no AccessArea could single out super_admin
// alone without restructuring that wildcard (and therefore admin/
// manager's other, unrelated permissions too), a far larger change than
// this conservative release calls for. This is "the smallest explicit
// MIADIAMANTE access gate within the existing permission architecture,"
// not a new parallel authentication mechanism: it reuses the exact same
// Role type, the exact same getCurrentRole() resolution path (so an
// isActive/deactivated check is already included for free), and the
// exact same DENIAL_MESSAGES copy as every other decision in this file.
export interface MiadiamanteAccessDecision {
  allowed: boolean;
  role: Role | null;
  message?: string;
}

export function decideMiadiamanteAccess(role: Role | null): MiadiamanteAccessDecision {
  if (!role) {
    return { allowed: false, role: null, message: DENIAL_MESSAGES.unauthenticated };
  }
  if (role !== "super_admin") {
    return { allowed: false, role, message: DENIAL_MESSAGES.human_rbac_denied };
  }
  return { allowed: true, role };
}

export async function authorizeMiadiamanteAccess(): Promise<MiadiamanteAccessDecision> {
  const role = await getCurrentRole();
  return decideMiadiamanteAccess(role);
}

// --- Canonical server-derived identity helper ---------------------------
// Phase 2B-3 rate-limiter-wiring refactor (owner decision): this was
// previously a private, unexported function inside conversationStore.ts.
// Moved here — not duplicated — because this IS Layer 1's own job
// ("derive identity, enforce whether this human may use MIADIAMANTE at
// all"), and because a second future caller (providerExecutor.ts) now
// needs the exact same resolution with no risk of a second, driftable
// copy. conversationStore.ts imports this instead of defining its own.
//
// Returns the authenticated session's email, lowercased, ONLY if
// authorizeMiadiamanteAccess() (Layer 1, super_admin-only for this
// release) admits the caller — null on any denial (unauthenticated,
// inactive/deactivated, or simply not an authorized role), collapsing
// every reason to the same "no identity" outcome so a caller can never
// distinguish *why* access was denied from this function's return value
// alone.
//
// There is no parameter here at all — this function takes no input from
// its caller, so there is structurally no way for a caller to supply or
// override the email or role it resolves. It always re-derives identity
// fresh from the current request's session; nothing is cached.
export async function getMiadiamanteAuthorizedSessionEmail(): Promise<string | null> {
  const accessResult = await authorizeMiadiamanteAccess();
  if (!accessResult.allowed) {
    return null;
  }
  const session = await auth();
  const email = session?.user?.email;
  return email ? email.toLowerCase() : null;
}
