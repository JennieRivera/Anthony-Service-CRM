// MIADIAMANTE AI Foundation — Phase 1B (entry shaping) + Phase 2A (real
// write). Master prompt (Phase 2A) section 12: "Now that
// requested_by_user_email exists, implement real capability audit logging
// for these server-side read tools if the existing ai_activity_log
// architecture safely supports it." It does — see the schema audit below
// — so this file now actually inserts a row, not just shapes one.
//
// Why email, not a user_id FK for "who requested" — see the schema.ts
// comment on requestedByUserEmail for the full reasoning (short version:
// ADMIN_EMAIL / the owner can be a fully valid super_admin session with NO
// corresponding `users` row, and session.user.id is the OAuth provider's
// own account id, not reliably `users.id` — there is no Auth.js database
// adapter configured). Email is the one identity every authenticated
// session is guaranteed to have, and it is the exact key getCurrentRole()
// itself resolves identity by.
//
// agentId / nullable finding (Phase 2A section 13): ai_activity_log.agent_id
// is a plain nullable FK (`uuid("agent_id").references(() => aiAgents.id,
// { onDelete: "set null" })` — no `.notNull()`), confirmed by direct
// schema read. A row with `agentId: null` is fully valid and insertable —
// no fake ai_agents row is needed or created to satisfy this column.
// MIADIAMANTE stays outside ai_agents, exactly as approved.

import { getDb } from "@/lib/db";
import { aiActivityLog } from "@/lib/db/schema";
import { sanitizeForAiVisibility } from "@/lib/ai/sensitiveData";
import type { MiadiamanteAuthorizationResult } from "./authorize";
import type { AiModuleKeyOrNone } from "./capabilities";

export interface MiadiamanteAuditEntry {
  // Matches aiActivityLog's shape. agentId stays null — MIADIAMANTE has
  // no ai_agents row by design (see file header) — never fabricated.
  agentId: null;
  clientId: null;
  caseId: null;
  action: "other"; // no MIADIAMANTE-specific ai_activity_action enum value exists yet — see report item Z (schema changes)
  // The capability's own moduleKey (capabilities.ts) when an exact
  // aiModuleKeyEnum match exists (e.g. "tasks", "appointments"), else
  // null — never a guessed nearest-fit value.
  moduleKey: AiModuleKeyOrNone;
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
// none exist as DB columns at all — see Phase 1 report item H), full
// invoice/task/appointment contents, private notes, or unnecessary prompt
// text. The only free text here is the capability name and denial reason,
// both already-safe fixed vocabulary from capabilities.ts / authorize.ts —
// run through sanitizeForAiVisibility anyway, matching the existing
// authorizeAndLogAgentAction() convention, so this stays safe even if a
// future caller passes richer actionDetail.
export function buildMiadiamanteAuditEntry(params: {
  capabilityName: string;
  requestedByEmail: string | null; // server-derived only — see security note in capabilityRunner.ts
  result: MiadiamanteAuthorizationResult;
  moduleKey?: AiModuleKeyOrNone;
}): MiadiamanteAuditEntry {
  const note = params.result.allowed
    ? `capability=${params.capabilityName}`
    : `capability=${params.capabilityName} denied_reason=${params.result.reason}`;

  return {
    agentId: null,
    clientId: null,
    caseId: null,
    action: "other",
    moduleKey: params.moduleKey ?? null,
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

// The one place a MIADIAMANTE audit row is ever inserted. Deliberately
// fails OPEN on its own error (logs to console, never throws) — a failure
// to WRITE an audit row must never retroactively change an
// already-computed authorization decision or block an already-authorized
// response; it must also never be silent, so a console.error is raised
// for operational visibility. This mirrors the existing
// authorizeAndLogAgentAction() pattern's spirit (check-and-log together)
// while keeping the two concerns (decide vs. record) separately testable
// — see authorize.test.ts, which exercises decideMiadiamanteRead() as a
// pure function with zero DB access, never this function.
export async function writeMiadiamanteAuditEntry(entry: MiadiamanteAuditEntry): Promise<void> {
  try {
    const db = getDb();
    await db.insert(aiActivityLog).values(entry);
  } catch (err) {
    console.error("MIADIAMANTE audit log write failed (non-blocking):", err);
  }
}
