// MIADIAMANTE AI Foundation — Phase 1B. Audit-entry SHAPING only — this
// file does not call getDb() or insert anything (still no live write this
// phase; the migration that adds the column below is generated but NOT
// applied — see drizzle/0057_handy_war_machine.sql and the Phase 1B
// report item H). Master prompt section 13 asks to "reuse ai_activity_log
// where appropriate rather than creating a duplicate audit system."
//
// Phase 1B correction: ai_activity_log now has a real, additive
// `requested_by_user_email` column (schema.ts) dedicated to "which human
// made this request" — distinct from the pre-existing `humanApproverEmail`
// ("who approved it, if anyone"). The interim Phase 1 workaround of
// folding the requester into actionDetail free text is removed; the
// requester is now a structured field, never parsed out of a sentence.
//
// Why email, not a user_id FK — see the schema.ts comment on
// requestedByUserEmail for the full reasoning (short version: ADMIN_EMAIL
// / the owner can be a fully valid super_admin session with NO
// corresponding `users` row, and session.user.id is the OAuth provider's
// own account id, not reliably `users.id` — there is no Auth.js database
// adapter configured). Email is the one identity every authenticated
// session is guaranteed to have, and it is the exact key getCurrentRole()
// itself resolves identity by.

import { sanitizeForAiVisibility } from "@/lib/ai/sensitiveData";
import type { MiadiamanteAuthorizationResult } from "./authorize";

export interface MiadiamanteAuditEntry {
  // Matches aiActivityLog's shape. agentId stays null until a real
  // ai_agents row exists for MIADIAMANTE (see the Phase 1 report's
  // identity recommendation) — never fabricated.
  agentId: null;
  clientId: null;
  caseId: null;
  action: "other"; // no MIADIAMANTE-specific ai_activity_action enum value exists yet — see report item T (schema changes)
  moduleKey: null; // aiModuleKeyEnum has no 1:1 match for every MIADIAMANTE capability yet (e.g. no "navigation" key) — left null rather than guessing a nearest-fit value
  // WHO requested the action. Always server-derived (the caller passes
  // the session email resolved by capabilityRunner.ts — see security
  // note there), NEVER client-supplied, NEVER a model-generated value.
  // Normalized to lowercase, matching users.email's own convention. Null
  // only when no session email exists at all (should not occur in
  // practice — authorizeMiadiamanteRead already requires a role, which
  // requires a session — but typed nullable because the column is).
  requestedByUserEmail: string | null;
  actionDetail: string | null;
  approvalLevel: "level_1_automatic";
  requiresHumanApproval: false;
  humanApproved: null;
  humanApproverEmail: null;
  outcome: "success" | "denied";
  errorMessage: string | null;
}

// Never logs: passwords, secrets, raw SSNs/ITINs (the schema audit found
// none exist as DB columns at all — see report item H), full document
// contents, or unnecessary prompt text. The only free text here is the
// capability name and denial reason, both already-safe fixed vocabulary
// from capabilities.ts / authorize.ts — run through sanitizeForAiVisibility
// anyway, matching the existing authorizeAndLogAgentAction() convention,
// so this stays safe even if a future caller passes richer actionDetail.
export function buildMiadiamanteAuditEntry(params: {
  capabilityName: string;
  requestedByEmail: string | null; // server-derived only — see security note in capabilityRunner.ts
  result: MiadiamanteAuthorizationResult;
}): MiadiamanteAuditEntry {
  const note = params.result.allowed
    ? `capability=${params.capabilityName}`
    : `capability=${params.capabilityName} denied_reason=${params.result.reason}`;

  return {
    agentId: null,
    clientId: null,
    caseId: null,
    action: "other",
    moduleKey: null,
    requestedByUserEmail: params.requestedByEmail ? params.requestedByEmail.toLowerCase() : null,
    actionDetail: sanitizeForAiVisibility(note),
    approvalLevel: "level_1_automatic",
    requiresHumanApproval: false,
    humanApproved: null,
    humanApproverEmail: null,
    outcome: params.result.allowed ? "success" : "denied",
    errorMessage: params.result.allowed ? null : params.result.message,
  };
}
