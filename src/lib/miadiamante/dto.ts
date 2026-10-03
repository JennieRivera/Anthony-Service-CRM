// MIADIAMANTE AI Foundation — Phase 1 + 2A. Safe, explicit-allow-list DTOs
// for every implemented read capability. Master prompt section 8: "Never
// pass entire database rows to an AI layer simply because the user can
// access the page" — no function below selects or returns a raw table
// row or an existing query function's full row shape unfiltered; each
// lists its output fields by hand, even when it reuses an existing query.
//
// These are plain server-side functions, not server actions — the actual
// callable entry point (which also performs the authorize.ts check) lives
// in capabilityRunner.ts.

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invoices, clients } from "@/lib/db/schema";
import { getCurrentRole, canAccessArea, getReportsVisibility, roleValues, type AccessArea, type Role } from "@/lib/permissions";
import { auth } from "@/auth";
import {
  getRecordedPaymentsByInvoice,
  computeBalanceDue,
  getRevenueBillingReport,
  getRecordedPaymentsReport,
  getOutstandingInvoicesReport,
  getReferralCompensationReport,
  getB2BAlliancePerformanceReport,
  getMembershipFinancialReport,
} from "@/lib/queries/financialReports";
import { listOpenTasks } from "@/lib/queries/tasks";
import { listUpcomingAppointments } from "@/lib/queries/appointments";

export interface CurrentUserContextDto {
  email: string;
  name: string | null;
  role: Role;
}

// current_user_context.read — section 9 "minimum necessary": only the
// caller's own identity, never a lookup of any other user.
export async function getCurrentUserContext(): Promise<CurrentUserContextDto | null> {
  const session = await auth();
  const role = await getCurrentRole();
  if (!session?.user?.email || !role) return null;
  return {
    email: session.user.email,
    name: session.user.name ?? null,
    role,
  };
}

export interface AuthorizedNavigationDto {
  role: Role;
  accessibleAreas: AccessArea[];
}

// authorized_navigation.read — derived entirely from the existing
// canAccessArea() check already enforced everywhere else; no new
// visibility rule is invented here. Reuses roleValues/AccessArea exports
// directly from permissions.ts rather than hardcoding a second area list.
export async function getAuthorizedNavigation(): Promise<AuthorizedNavigationDto | null> {
  const role = await getCurrentRole();
  if (!role) return null;

  // permissions.ts exports AccessArea as a type, not a runtime array, so
  // there's no list to iterate without one. Rather than hand-duplicating
  // every AccessArea literal here (a second, driftable copy of the type),
  // this intentionally returns only the areas already known to be
  // reachable through today's real navigation surface — the same set
  // nav-items.ts / nav-drawers.ts actually render links for. A future
  // phase that wants the full AccessArea surface here should export a
  // runtime `accessAreaValues` array from permissions.ts (mirroring
  // `roleValues`) rather than have this file guess at completeness.
  const NAV_RELEVANT_AREAS: AccessArea[] = [
    "notary",
    "online_notary",
    "tax_prep",
    "bookkeeping",
    "immigration",
    "credit_financing",
    "company_registration",
    "academy",
    "marketing",
    "referrals",
    "alliances",
    "companies",
    "documents",
    "invoices",
    "payments",
    "reports",
    "financial_reports",
    "diamond_community",
    "ai_team",
    "settings",
  ];

  return {
    role,
    accessibleAreas: NAV_RELEVANT_AREAS.filter((area) => canAccessArea(role, area)),
  };
}

// Exported for the deterministic test script — never used by the runner
// itself, which always calls getCurrentRole() for a real session.
export const _knownRoleValues = roleValues;

// --- Phase 2A: record-level read DTOs --------------------------------------

export interface InvoiceSummaryDto {
  id: string;
  invoiceNumber: string;
  clientName: string;
  issueDate: string | null;
  dueDate: string | null;
  total: number;
  status: string;
  recordedPayments: number;
  balanceDue: number;
}

// invoice_summary.read — one invoice by validated id. Field list is
// hand-picked: excludes invoices.notes, paymentMethod, subtotal,
// taxAmount, paidAt. Balance Due reuses the exact approved
// getRecordedPaymentsByInvoice()/computeBalanceDue() pair (financialReports.ts)
// — never a second, re-derived calculation (master prompt section 28).
// No row-level ownership scoping exists for invoices in this app today
// (confirmed by direct audit of listInvoicesWithClient()/getInvoiceById()
// and the real Invoices page — any role with the "invoices" AccessArea can
// see any invoice) — this capability mirrors that, it does not invent a
// narrower or broader rule.
export async function getInvoiceSummary(invoiceId: string): Promise<InvoiceSummaryDto | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: invoices.id,
      invoiceSeq: invoices.invoiceSeq,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      total: invoices.total,
      clientName: clients.fullName,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!row) return null;

  const recordedByInvoice = await getRecordedPaymentsByInvoice();
  const total = Number(row.total);
  const recordedPayments = recordedByInvoice.get(row.id) ?? 0;

  return {
    id: row.id,
    invoiceNumber: `INV-${String(row.invoiceSeq).padStart(5, "0")}`,
    clientName: row.clientName,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    total,
    status: row.status,
    recordedPayments,
    balanceDue: computeBalanceDue(total, recordedPayments),
  };
}

export interface FinancialReportSummaryDto {
  dateRange: { from: string; to: string };
  // Each section is null when the role's getReportsVisibility() doesn't
  // grant it — identical gating to the real Reports page's own tabs, so
  // this capability can never show a role a section the UI itself hides.
  full: {
    totalInvoiced: number;
    paidInvoiceAmount: number;
    recordedPayments: number;
    outstandingBalance: number;
  } | null;
  referral: {
    compensationEarned: number;
    compensationApprovedPayable: number;
    compensationPaid: number;
    compensationOutstanding: number;
  } | null;
  b2b: {
    attributedBusiness: number;
    membershipContractedFee: number;
    membershipInvoiced: number;
    membershipPaid: number;
  } | null;
}

// financial_report_summary.read — reuses getReportsVisibility(role)
// verbatim (master prompt section 20) and the same existing report query
// functions the Reports page itself calls — never a parallel
// implementation of Outstanding/compensation/attribution arithmetic.
// Returns totals only; never the underlying row lists.
export async function getFinancialReportSummary(
  role: Role,
  range?: { from?: Date; to?: Date },
): Promise<FinancialReportSummaryDto> {
  const visibility = getReportsVisibility(role);

  const to = range?.to ?? new Date();
  const from = range?.from ?? new Date(to.getFullYear() - 1, to.getMonth(), to.getDate());
  const dateRange = { from, to };

  const [billing, recordedPaymentsReport, outstanding, referralCompensation, b2bPerformance, membershipFinancials] =
    await Promise.all([
      visibility.full ? getRevenueBillingReport(dateRange) : Promise.resolve(null),
      visibility.full ? getRecordedPaymentsReport(dateRange) : Promise.resolve(null),
      visibility.full ? getOutstandingInvoicesReport() : Promise.resolve(null),
      visibility.referral ? getReferralCompensationReport(dateRange) : Promise.resolve(null),
      visibility.b2b ? getB2BAlliancePerformanceReport() : Promise.resolve(null),
      visibility.b2b ? getMembershipFinancialReport() : Promise.resolve(null),
    ]);

  return {
    dateRange: { from: from.toISOString(), to: to.toISOString() },
    full:
      billing && recordedPaymentsReport && outstanding
        ? {
            totalInvoiced: billing.totalInvoiced,
            paidInvoiceAmount: billing.paidInvoiceAmount,
            recordedPayments: recordedPaymentsReport.recordedTotal,
            outstandingBalance: outstanding.outstandingTotal,
          }
        : null,
    referral: referralCompensation
      ? {
          compensationEarned: referralCompensation.earnedTotal,
          compensationApprovedPayable: referralCompensation.approvedTotal,
          compensationPaid: referralCompensation.paidTotal,
          compensationOutstanding: referralCompensation.outstandingTotal,
        }
      : null,
    b2b:
      b2bPerformance && membershipFinancials
        ? {
            attributedBusiness: b2bPerformance.reduce((sum, r) => sum + r.attributedInvoiceTotal, 0),
            membershipContractedFee: membershipFinancials.contractedFeeTotal,
            membershipInvoiced: membershipFinancials.invoicedTotal,
            membershipPaid: membershipFinancials.paidTotal,
          }
        : null,
  };
}

export interface TaskListItemDto {
  id: string;
  type: string;
  title: string;
  dueDate: string | null;
  status: "open";
  clientName: string;
  caseTitle: string | null;
}

export interface TaskListDto {
  tasks: TaskListItemDto[];
}

// task_list.read — reuses listOpenTasks() verbatim (already excludes any
// notes field), capped server-side at the validated limit. Mirrors the
// real Tasks page's own unscoped-by-assignee behavior (confirmed by audit
// — see capabilities.ts) rather than inventing a narrower "my tasks only"
// rule the app itself doesn't enforce.
export async function getTaskListSummary(limit: number): Promise<TaskListDto> {
  const all = await listOpenTasks();
  return {
    tasks: all.slice(0, limit).map((t) => ({
      id: t.id,
      type: t.type,
      title: t.title,
      dueDate: t.dueDate,
      status: "open",
      clientName: t.clientName,
      caseTitle: t.caseTitle,
    })),
  };
}

export interface AppointmentListItemDto {
  id: string;
  title: string;
  serviceType: string;
  startAt: string;
  clientName: string;
}

export interface UpcomingAppointmentsDto {
  appointments: AppointmentListItemDto[];
}

// upcoming_appointments.read — reuses listUpcomingAppointments(limit)
// verbatim (already excludes location and any notes field). Mirrors the
// real Appointments page's own unscoped-by-assignee behavior (confirmed
// by audit — see capabilities.ts).
export async function getUpcomingAppointmentsSummary(limit: number): Promise<UpcomingAppointmentsDto> {
  const rows = await listUpcomingAppointments(limit);
  return {
    appointments: rows.map((r) => ({
      id: r.id,
      title: r.title,
      serviceType: r.serviceType,
      startAt: r.startAt.toISOString(),
      clientName: r.clientName,
    })),
  };
}
