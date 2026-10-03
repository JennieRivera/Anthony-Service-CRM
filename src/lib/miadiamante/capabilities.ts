// MIADIAMANTE AI Foundation — Phase 1 (Intelligence Architecture + Safe
// Read Access) + Phase 2A (Safe Record-Level Read Access). This is a
// READ-ONLY capability registry: the smallest unit MIADIAMANTE's future
// request pipeline (see authorize.ts) can be asked to perform. No
// write/draft/protected capability exists here — that is an explicit,
// hard boundary for both phases (master prompt sections 1 and 11, and
// Phase 2A's own "DO NOT ADD WRITE ACTIONS").
//
// Every capability name below is deliberately the same shape as the
// existing `AccessArea` names in `src/lib/permissions.ts` wherever an
// AccessArea already covers the resource — this registry does not
// invent a second, parallel authorization vocabulary. Where no
// AccessArea exists at the right granularity (e.g. "who am I",
// "what can I navigate to", or a module the real app itself never gated
// — Tasks/Appointments, confirmed by direct audit of their pages, see
// dto.ts), a capability is defined without one and marked
// `requiredAccessArea: null`, meaning "available to any authenticated
// user" — mirroring the app's own real behavior, never inventing a
// stricter gate the human UI doesn't itself enforce.
//
// This file defines WHAT exists. It enforces nothing by itself — see
// authorize.ts for the human-RBAC-AND-AI-permission check every
// capability must pass before it may run.

import { getReportsVisibility, type AccessArea, type Role } from "@/lib/permissions";
import type { aiModuleKeyEnum } from "@/lib/db/schema";

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

// The real Postgres enum values (src/lib/db/schema.ts) — reused verbatim
// for audit traceability (ai_activity_log.module_key), never a second,
// parallel module vocabulary. `null` is used where NO existing value
// precisely matches (e.g. "invoice summary", "financial report
// aggregate") — the same honest discipline Phase 1's audit.ts already
// established: never guess a nearest-fit enum value.
export type AiModuleKeyOrNone = (typeof aiModuleKeyEnum.enumValues)[number] | null;

export interface MiadiamanteCapability {
  /** Stable identifier, e.g. "invoice_summary.read". Never reused for a different meaning. */
  name: string;
  description: string;
  /**
   * The human-RBAC gate (src/lib/permissions.ts AccessArea). `null` means
   * "every authenticated user" — used only for capabilities that return
   * no module-specific data, OR that mirror a real app module which is
   * itself ungated today (Tasks, Appointments — confirmed by direct
   * audit, not assumed), OR that use `compositeVisibilityCheck` below
   * instead (in which case this field is set to `null` as a marker and
   * ignored by authorize.ts).
   */
  requiredAccessArea: AccessArea | null;
  /**
   * For a capability whose human-RBAC gate is a composed OR of multiple
   * AccessAreas rather than a single one — e.g. financial_report_summary.read
   * must mirror the real Reports page's own `getReportsVisibility(role).any`
   * gate (master prompt section 20), not a single "reports" AccessArea,
   * or referral_manager/community_manager (who hold referral/B2B areas but
   * not "reports" itself) would be wrongly denied the capability entirely
   * instead of receiving their own authorized section. When present, this
   * takes precedence over `requiredAccessArea` in authorize.ts's layer 1.
   */
  compositeVisibilityCheck?: (role: Role) => boolean;
  operationType: MiadiamanteOperationType;
  approvalLevel: MiadiamanteApprovalLevel;
  maskingPolicy: MaskingPolicy;
  /** Short note on the minimum-necessary data this capability is scoped to return. */
  minimumNecessaryNote: string;
  /** ai_activity_log.module_key value this capability's audit rows are tagged with, or null if no exact match exists. */
  moduleKey: AiModuleKeyOrNone;
  /** Name of the zod schema (schemas.ts) that validates this capability's input server-side. `null` for no-input capabilities. */
  inputSchemaRef: string | null;
  /** Name of the DTO type (dto.ts) this capability's output conforms to. */
  outputDtoRef: string;
}

// --- Phase 1 + 2A implemented capabilities ----------------------------------
// Phase 1's two identity/navigation capabilities return zero record data.
// Phase 2A adds the first four RECORD-LEVEL read capabilities (master
// prompt section 1's explicit, smallest-useful-set list) — each backed by
// a real, reused query function and a hand-written DTO (see dto.ts), never
// an arbitrary ORM row. Every other candidate capability (client.read,
// academy_*.read, b2b_*.read, referral_compensation.read, document content,
// etc.) remains NOT YET IMPLEMENTED — the registry documents the intended
// future shape without a caller being able to invoke something that
// doesn't exist yet.
export const IMPLEMENTED_CAPABILITIES = [
  "current_user_context.read",
  "authorized_navigation.read",
  "invoice_summary.read",
  "financial_report_summary.read",
  "task_list.read",
  "upcoming_appointments.read",
] as const;

export type ImplementedCapabilityName = (typeof IMPLEMENTED_CAPABILITIES)[number];

// --- Full conceptual registry ------------------------------------------
// Every capability candidate named across master prompt sections 7, 30,
// and Phase 2A section 1, defined here for architecture completeness.
// `implemented: false` entries have no DTO/query behind them yet —
// authorize.ts refuses them with a clear "not implemented" outcome
// rather than a silent pass.
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
    moduleKey: null,
    inputSchemaRef: null,
    outputDtoRef: "CurrentUserContextDto",
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
    moduleKey: null,
    inputSchemaRef: null,
    outputDtoRef: "AuthorizedNavigationDto",
    implemented: true,
  },

  // --- Phase 2A: record-level read capabilities --------------------------
  "invoice_summary.read": {
    name: "invoice_summary.read",
    description: "A single authorized invoice's number/date/total/status/balance — looked up by a validated invoice id.",
    requiredAccessArea: "invoices",
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "field_level",
    minimumNecessaryNote:
      "One invoice by id only — excludes notes, paymentMethod, subtotal/taxAmount breakdown. Balance Due reuses the exact approved getRecordedPaymentsByInvoice()/computeBalanceDue() helpers, never a re-derived calculation. No row-level ownership scoping exists in the app today (any role with the 'invoices' AccessArea can see any invoice) — mirrored, not invented.",
    moduleKey: null, // no exact "invoice summary" module key exists in aiModuleKeyEnum — left null rather than guessing (payment_status/full_financial_records/bookkeeping_records are all near-fits, not exact)
    inputSchemaRef: "invoiceSummaryInputSchema",
    outputDtoRef: "InvoiceSummaryDto",
    implemented: true,
  },
  "financial_report_summary.read": {
    name: "financial_report_summary.read",
    description: "Authorized top-line financial aggregates (never row-level detail) for a date range, filtered to exactly the sections the role could see on the real Reports page.",
    // null + compositeVisibilityCheck, NOT a single "reports" AccessArea —
    // see the field doc above. A referral_manager or community_manager
    // holds no "reports"/"financial_reports" area at all, but must still
    // be able to call this capability to receive their own authorized
    // referral/B2B section (master prompt section 25) — exactly how they
    // can already open the real Reports page today via hasReferralViewAccess
    // /hasAllianceViewAccess-style composition, never a single-area gate.
    requiredAccessArea: null,
    compositeVisibilityCheck: (role) => getReportsVisibility(role).any,
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "field_level",
    minimumNecessaryNote:
      "Reuses getReportsVisibility() verbatim — the full/referral/b2b section flags gate which aggregates are computed and returned, identical to the Reports page's own tab gating. Returns totals only (Total Invoiced, Paid Invoice Amount, Recorded Payments, Outstanding Balance, Referral Compensation Earned/Approved/Paid/Outstanding, B2B Attributed Business, Membership Contracted/Invoiced/Paid) — never the underlying row lists (individual invoices, individual compensations, individual alliances/memberships).",
    moduleKey: null, // no exact match; full_financial_records/bookkeeping_records are broader/narrower than this aggregate-only, section-gated capability
    inputSchemaRef: "financialReportSummaryInputSchema",
    outputDtoRef: "FinancialReportSummaryDto",
    implemented: true,
  },
  "task_list.read": {
    name: "task_list.read",
    description: "Open internal tasks (id, title, due date, status, type, linked client/case display name) — mirrors the real Tasks page, which has no dedicated AccessArea and is visible to any authenticated staff member today.",
    requiredAccessArea: null, // confirmed by direct audit: src/app/[locale]/(app)/tasks/page.tsx has no requireAccessArea/getCurrentRole check at all
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "field_level",
    minimumNecessaryNote:
      "Reuses listOpenTasks() verbatim (already excludes any notes field) — status defaults to open, capped at a bounded limit. No per-assignee scoping exists in the app today (the Tasks page shows all open tasks to any authenticated user) — mirrored, not invented.",
    moduleKey: "tasks", // exact match exists in aiModuleKeyEnum
    inputSchemaRef: "taskListInputSchema",
    outputDtoRef: "TaskListDto",
    implemented: true,
  },
  "upcoming_appointments.read": {
    name: "upcoming_appointments.read",
    description: "The next N upcoming appointments (id, title, service type, start time, client display name) — mirrors the real Appointments/Calendar page, which has no dedicated AccessArea.",
    requiredAccessArea: null, // confirmed by direct audit: the appointments page has no requireAccessArea/getCurrentRole check at all
    operationType: "read",
    approvalLevel: "level_1_automatic",
    maskingPolicy: "field_level",
    minimumNecessaryNote:
      "Reuses listUpcomingAppointments(limit) verbatim — already excludes location and any notes field, already bounded by its own limit parameter, which this capability further caps server-side. No per-assignee scoping exists in the app today — mirrored, not invented.",
    moduleKey: "appointments", // exact match exists in aiModuleKeyEnum
    inputSchemaRef: "upcomingAppointmentsInputSchema",
    outputDtoRef: "UpcomingAppointmentsDto",
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
    moduleKey: "clients",
    inputSchemaRef: null,
    outputDtoRef: "(not implemented)",
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
    moduleKey: null,
    inputSchemaRef: null,
    outputDtoRef: "(not implemented)",
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
    moduleKey: null,
    inputSchemaRef: null,
    outputDtoRef: "(not implemented)",
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
    moduleKey: "referral_commission_records",
    inputSchemaRef: null,
    outputDtoRef: "(not implemented)",
    implemented: false,
  },
};
