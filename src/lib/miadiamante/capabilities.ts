// MIADIAMANTE AI Foundation — Phase 1 (Intelligence Architecture + Safe
// Read Access). This is a READ-ONLY capability registry: the smallest
// unit MIADIAMANTE's future request pipeline (see authorize.ts) can be
// asked to perform. No write/draft/protected capability exists here —
// that is an explicit, hard boundary for this phase (master prompt
// sections 1 and 11).
//
// Every capability name below is deliberately the same shape as the
// existing `AccessArea` names in `src/lib/permissions.ts` wherever an
// AccessArea already covers the resource — this registry does not
// invent a second, parallel authorization vocabulary. Where no
// AccessArea exists at the right granularity (e.g. "who am I",
// "what can I navigate to"), a capability is defined without one and
// marked `requiredAccessArea: null`, meaning "available to any
// authenticated user" rather than "ungated."
//
// This file defines WHAT exists. It enforces nothing by itself — see
// authorize.ts for the human-RBAC-AND-AI-permission check every
// capability must pass before it may run.

import type { AccessArea } from "@/lib/permissions";

export type MiadiamanteOperationType = "read";

// Mirrors the AI Foundation's existing 3-tier policy
// (src/lib/ai/agentActivity.ts) so a future write/draft/protected
// capability — NOT implemented in this phase — slots into the same
// scale instead of inventing a fourth approval concept. Every read
// capability below is level_1: read access, once both RBAC layers
// pass, requires no additional human approval step.
export type MiadiamanteApprovalLevel =
  | "level_1_automatic"
  | "level_2_human_review"
  | "level_3_human_only";

export type MaskingPolicy =
  | "none" // no sensitive fields in this capability's output
  | "field_level"; // output passes through a named DTO that already excludes/masks sensitive fields — see dto.ts

export interface MiadiamanteCapability {
  /** Stable identifier, e.g. "client.read". Never reused for a different meaning. */
  name: string;
  description: string;
  /**
   * The human-RBAC gate (src/lib/permissions.ts AccessArea). `null` means
   * "every authenticated user" — used only for capabilities that return
   * no module-specific data (identity, navigation shape).
   */
  requiredAccessArea: AccessArea | null;
  operationType: MiadiamanteOperationType;
  approvalLevel: MiadiamanteApprovalLevel;
  maskingPolicy: MaskingPolicy;
  /** Short note on the minimum-necessary data this capability is scoped to return. */
  minimumNecessaryNote: string;
}

// --- Phase 1 implemented capabilities --------------------------------------
// Deliberately the smallest useful set, per master prompt section 30/31:
// both capabilities below return zero client/financial/academy/B2B
// record data — only facts already derivable from the signed-in
// session + the existing, already-enforced permissions.ts logic. No new
// query layer, no new sensitive surface. Every other candidate capability
// named in the master prompt (client.read, invoice.read, academy_*.read,
// b2b_*.read, etc.) is defined below as NOT YET IMPLEMENTED, so the
// registry documents the intended future shape without a caller being
// able to invoke something that doesn't exist.
export const IMPLEMENTED_CAPABILITIES = [
  "current_user_context.read",
  "authorized_navigation.read",
] as const;

export type ImplementedCapabilityName = (typeof IMPLEMENTED_CAPABILITIES)[number];

// --- Full conceptual registry ------------------------------------------
// Every capability candidate named across master prompt sections 7 and
// 30, defined here for architecture completeness. `implemented: false`
// entries have no DTO/query behind them yet — authorize.ts refuses them
// with a clear "not implemented" outcome rather than a silent pass.
export const CAPABILITY_REGISTRY: Record<
  string,
  MiadiamanteCapability & { implemented: boolean }
> = {
  "current_user_context.read": {
    name: "current_user_context.read",
    description: "The signed-in staff member's own name, email, and role — never another user's.",
    requiredAccessArea: null,
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "none",
    minimumNecessaryNote: "Returns only the caller's own session-derived identity fields, nothing from another table.",
    implemented: true,
  },
  "authorized_navigation.read": {
    name: "authorized_navigation.read",
    description: "Which top-level CRM areas the signed-in staff member is authorized to open, derived from their existing role.",
    requiredAccessArea: null,
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "none",
    minimumNecessaryNote: "Returns an AccessArea->boolean map via the existing canAccessArea() check — no record data.",
    implemented: true,
  },

  // --- Not implemented this phase — documented shape only ---------------
  "client.read": {
    name: "client.read",
    description: "A single authorized client's non-sensitive profile summary.",
    requiredAccessArea: null, // client access today is not gated by a single AccessArea (see audit finding — report item G)
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "field_level",
    minimumNecessaryNote: "One client by id, name/contact/status fields only — never the full row, never other clients.",
    implemented: false,
  },
  "appointment.read": {
    name: "appointment.read",
    description: "The signed-in staff member's own upcoming appointments.",
    requiredAccessArea: null,
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "field_level",
    minimumNecessaryNote: "A bounded upcoming window, not the full appointments table.",
    implemented: false,
  },
  "task.read": {
    name: "task.read",
    description: "The signed-in staff member's open tasks.",
    requiredAccessArea: null,
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "field_level",
    minimumNecessaryNote: "Open tasks only, scoped to the caller.",
    implemented: false,
  },
  "invoice.read": {
    name: "invoice.read",
    description: "A single authorized invoice's status/total/balance summary.",
    requiredAccessArea: "invoices",
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "field_level",
    minimumNecessaryNote: "One invoice by id/number — must reuse the existing Financial Reporting balance-due semantics, never invent a new one.",
    implemented: false,
  },
  "report.read": {
    name: "report.read",
    description: "Authorized aggregate report figures (never row-level financial detail beyond what Reports already shows the role).",
    requiredAccessArea: "reports",
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "field_level",
    minimumNecessaryNote: "Must reuse getReportsVisibility() composition, not re-derive a parallel visibility rule.",
    implemented: false,
  },
  "academy_student.read": {
    name: "academy_student.read",
    description: "Authorized Academy student summary (name, program, status).",
    requiredAccessArea: "academy",
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "field_level",
    minimumNecessaryNote: "No grades/evaluations unless a separate capability for that is explicitly approved later.",
    implemented: false,
  },
  "b2b_alliance.read": {
    name: "b2b_alliance.read",
    description: "Authorized B2B alliance summary.",
    requiredAccessArea: "alliances",
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "field_level",
    minimumNecessaryNote: "Internal staff only — never exposed to an external B2B portal identity.",
    implemented: false,
  },
  "referral_compensation.read": {
    name: "referral_compensation.read",
    description: "Authorized referral compensation status (Earned/Approved/Paid), never an approval or payment action.",
    requiredAccessArea: "referral_compensation_terms",
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "field_level",
    minimumNecessaryNote: "Status only, reusing the existing compensation lifecycle — no commission inference across B2B network relationships.",
    implemented: false,
  },
};
