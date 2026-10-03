// MIADIAMANTE AI Foundation — Phase 1 + Phase 2A. The request lifecycle
// from master prompt section 15 (Phase 1) / section 22 (Phase 2A,
// "capabilities must remain server-only"), implemented end to end:
//
//   caller -> validate input (schemas.ts, pure, before any DB access)
//          -> authenticate (getCurrentRole, inside authorizeMiadiamanteRead)
//          -> capability lookup (authorize.ts)
//          -> RBAC check (authorize.ts, layer 1)
//          -> AI permission check (authorize.ts, layer 2)
//          -> controlled data retrieval (dto.ts — explicit field lists only,
//             reusing existing approved query functions)
//          -> (masking: not applicable to these capabilities — see
//             capabilities.ts maskingPolicy notes; sensitive fields are
//             excluded at the DTO layer, never fetched then redacted)
//          -> audit entry shaped AND written (audit.ts)
//          -> response
//
// This is a server-only module — nothing here is reachable from client
// code, no public API route wraps it (Phase 2A section 22: "Do not create
// public API endpoints"), and no step is skippable by a caller: every
// exported run* function always authorizes first, regardless of which
// capability or input is requested.
//
// No natural-language handling exists here at all (no intent
// classification, no provider call) — see provider.ts: the deployed
// MIADIAMANTE UI's chat input remains disabled this phase. This runner
// exists so the pipeline is real and testable before any UI wiring is
// proposed.
//
// SECURITY (section 11/section 22): the human-actor identity written into
// the audit entry below comes ONLY from `auth()` — the server-resolved
// session — never from a function parameter, request body, header, or any
// other caller-supplied input. Every exported function below takes, at
// most, the capability's OWN typed/validated input (an invoice id, a date
// range, a limit) — never an identity, role, or actor field. There is
// structurally no parameter a caller could use to spoof a different
// identity; this isn't just "a spoofed value is ignored," there is no
// input path for one to exist in the first place.
//
// SIDE-CHANNEL SAFETY (section 27): every denial — RBAC failure, malformed
// input, or "resource not found" — returns the SAME neutral message
// pattern to the caller. The richer, specific reason (e.g. "invoice not
// found") is recorded only in the audit entry's errorMessage, which is an
// internal operator-visible field, never part of the capability's return
// value to a caller.

import { auth } from "@/auth";
import { authorizeMiadiamanteRead, type MiadiamanteAuthorizationResult } from "./authorize";
import { buildMiadiamanteAuditEntry, writeMiadiamanteAuditEntry, type MiadiamanteAuditEntry } from "./audit";
import {
  getCurrentUserContext,
  getAuthorizedNavigation,
  getInvoiceSummary,
  getFinancialReportSummary,
  getTaskListSummary,
  getUpcomingAppointmentsSummary,
  type CurrentUserContextDto,
  type AuthorizedNavigationDto,
  type InvoiceSummaryDto,
  type FinancialReportSummaryDto,
  type TaskListDto,
  type UpcomingAppointmentsDto,
} from "./dto";
import { CAPABILITY_REGISTRY, type ImplementedCapabilityName } from "./capabilities";
import {
  invoiceSummaryInputSchema,
  financialReportSummaryInputSchema,
  taskListInputSchema,
  upcomingAppointmentsInputSchema,
} from "./schemas";

// Exported (Phase 2B-1) so the conversation controller's "unknown/
// unimplemented tool" denial uses the identical caller-facing copy as
// every Phase 2A denial path — one message, never a second, driftable
// copy of the same string.
export const NEUTRAL_UNAVAILABLE_MESSAGE = "Not authorized or resource unavailable.";

export type MiadiamanteCapabilityResult<TData> =
  | { allowed: true; data: TData; audit: MiadiamanteAuditEntry }
  | { allowed: false; message: string; audit: MiadiamanteAuditEntry };

// Shared first two pipeline steps for every capability: authenticate +
// authorize, then shape AND write the audit entry (fire-and-forget —
// writeMiadiamanteAuditEntry never throws, see audit.ts). Returns both the
// authorization result and the audit entry so callers can branch on
// result.allowed without re-deriving the audit shape.
async function authorizeAndAudit(capabilityName: ImplementedCapabilityName) {
  const result: MiadiamanteAuthorizationResult = await authorizeMiadiamanteRead(capabilityName);
  const session = await auth();
  const moduleKey = CAPABILITY_REGISTRY[capabilityName]?.moduleKey ?? null;

  const audit = buildMiadiamanteAuditEntry({
    capabilityName,
    requestedByEmail: session?.user?.email ?? null,
    result,
    moduleKey,
  });
  void writeMiadiamanteAuditEntry(audit);

  return { result, audit };
}

export async function runCurrentUserContext(): Promise<
  MiadiamanteCapabilityResult<CurrentUserContextDto>
> {
  const { result, audit } = await authorizeAndAudit("current_user_context.read");
  if (!result.allowed) return { allowed: false, message: result.message, audit };

  const data = await getCurrentUserContext();
  if (data === null) {
    // Should not happen given authorizeMiadiamanteRead already required a
    // role (which requires a session) — fail safe rather than return a
    // partial shape.
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE, audit: { ...audit, outcome: "denied", errorMessage: "fetchData returned null after authorization passed" } };
  }
  return { allowed: true, data, audit };
}

export async function runAuthorizedNavigation(): Promise<
  MiadiamanteCapabilityResult<AuthorizedNavigationDto>
> {
  const { result, audit } = await authorizeAndAudit("authorized_navigation.read");
  if (!result.allowed) return { allowed: false, message: result.message, audit };

  const data = await getAuthorizedNavigation();
  if (data === null) {
    return { allowed: false, message: NEUTRAL_UNAVAILABLE_MESSAGE, audit: { ...audit, outcome: "denied", errorMessage: "fetchData returned null after authorization passed" } };
  }
  return { allowed: true, data, audit };
}

// invoice_summary.read — rawInput validated by invoiceSummaryInputSchema
// (a well-formed UUID or nothing happens). "Not found" and "not
// authorized" return the identical neutral message to the caller (section
// 27) — the distinction is recorded only in the audit entry's
// errorMessage.
export async function runInvoiceSummary(
  rawInput: unknown,
): Promise<MiadiamanteCapabilityResult<InvoiceSummaryDto>> {
  const { result, audit } = await authorizeAndAudit("invoice_summary.read");
  if (!result.allowed) return { allowed: false, message: result.message, audit };

  const parsed = invoiceSummaryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      allowed: false,
      message: NEUTRAL_UNAVAILABLE_MESSAGE,
      audit: { ...audit, outcome: "denied", errorMessage: "malformed_input: invoiceId" },
    };
  }

  const data = await getInvoiceSummary(parsed.data.invoiceId);
  if (data === null) {
    return {
      allowed: false,
      message: NEUTRAL_UNAVAILABLE_MESSAGE,
      audit: { ...audit, outcome: "denied", errorMessage: "invoice not found" },
    };
  }
  return { allowed: true, data, audit };
}

// financial_report_summary.read — rawInput validated by
// financialReportSummaryInputSchema (optional, bounded date range).
// Section filtering (full/referral/b2b) happens inside
// getFinancialReportSummary() via getReportsVisibility(result.role) —
// never re-derived here.
export async function runFinancialReportSummary(
  rawInput: unknown,
): Promise<MiadiamanteCapabilityResult<FinancialReportSummaryDto>> {
  const { result, audit } = await authorizeAndAudit("financial_report_summary.read");
  if (!result.allowed) return { allowed: false, message: result.message, audit };

  const parsed = financialReportSummaryInputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      allowed: false,
      message: NEUTRAL_UNAVAILABLE_MESSAGE,
      audit: { ...audit, outcome: "denied", errorMessage: "malformed_input: date range" },
    };
  }

  const data = await getFinancialReportSummary(result.role, parsed.data);
  return { allowed: true, data, audit };
}

// task_list.read — rawInput validated by taskListInputSchema (a bounded
// limit only; see schemas.ts for why no status filter is offered yet).
export async function runTaskList(
  rawInput: unknown,
): Promise<MiadiamanteCapabilityResult<TaskListDto>> {
  const { result, audit } = await authorizeAndAudit("task_list.read");
  if (!result.allowed) return { allowed: false, message: result.message, audit };

  const parsed = taskListInputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      allowed: false,
      message: NEUTRAL_UNAVAILABLE_MESSAGE,
      audit: { ...audit, outcome: "denied", errorMessage: "malformed_input: limit" },
    };
  }

  const data = await getTaskListSummary(parsed.data.limit);
  return { allowed: true, data, audit };
}

// upcoming_appointments.read — rawInput validated by
// upcomingAppointmentsInputSchema (a bounded limit only).
export async function runUpcomingAppointments(
  rawInput: unknown,
): Promise<MiadiamanteCapabilityResult<UpcomingAppointmentsDto>> {
  const { result, audit } = await authorizeAndAudit("upcoming_appointments.read");
  if (!result.allowed) return { allowed: false, message: result.message, audit };

  const parsed = upcomingAppointmentsInputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      allowed: false,
      message: NEUTRAL_UNAVAILABLE_MESSAGE,
      audit: { ...audit, outcome: "denied", errorMessage: "malformed_input: limit" },
    };
  }

  const data = await getUpcomingAppointmentsSummary(parsed.data.limit);
  return { allowed: true, data, audit };
}
