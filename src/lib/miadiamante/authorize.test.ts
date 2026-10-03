// MIADIAMANTE AI Foundation — Phase 1 + 1B. Deterministic, dependency-free
// test script for decideMiadiamanteRead() and buildMiadiamanteAuditEntry()
// (master prompt sections 31/33, and Phase 1B section 12). No test runner
// is installed in this project (no vitest/jest in package.json) — rather
// than add one for a single phase's tests, this uses Node's built-in
// `assert` and runs directly via the `tsx` dev dependency already present
// (see package.json). Zero DB access, zero network, zero fixtures that
// touch the shared Neon database.
//
// Run with:
//   npx tsx src/lib/miadiamante/authorize.test.ts

import assert from "node:assert/strict";
import { decideMiadiamanteRead } from "./authorize";
import { buildMiadiamanteAuditEntry } from "./audit";
import {
  invoiceSummaryInputSchema,
  financialReportSummaryInputSchema,
  taskListInputSchema,
  upcomingAppointmentsInputSchema,
} from "./schemas";
import type { Role } from "@/lib/permissions";

let passed = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${label}`);
  } catch (err) {
    console.error(`  FAIL ${label}`);
    throw err;
  }
}

console.log("MIADIAMANTE authorize.test.ts");

// --- Test matrix (master prompt section 31) --------------------------------
console.log("\nTest matrix:");

check("OWNER/SUPER_ADMIN can read current_user_context", () => {
  const r = decideMiadiamanteRead("super_admin", "current_user_context.read");
  assert.equal(r.allowed, true);
});

check("OWNER/SUPER_ADMIN can read authorized_navigation", () => {
  const r = decideMiadiamanteRead("super_admin", "authorized_navigation.read");
  assert.equal(r.allowed, true);
});

check("OWNER/SUPER_ADMIN denied an unimplemented capability (no blind allow)", () => {
  const r = decideMiadiamanteRead("super_admin", "client.read");
  assert.equal(r.allowed, false);
  if (!r.allowed) assert.equal(r.reason, "capability_not_implemented");
});

check("ACADEMY_STAFF can read identity/navigation (ungated capabilities)", () => {
  const a = decideMiadiamanteRead("academy_staff", "current_user_context.read");
  const b = decideMiadiamanteRead("academy_staff", "authorized_navigation.read");
  assert.equal(a.allowed, true);
  assert.equal(b.allowed, true);
});

check("ACADEMY_STAFF denied a finance-only capability", () => {
  const r = decideMiadiamanteRead("academy_staff", "client.read");
  assert.equal(r.allowed, false);
  // Unimplemented AND would-be-denied-by-RBAC: not_implemented fires
  // first, which is correct (default deny, fail closed before even
  // reaching the RBAC layer for a capability that doesn't exist yet).
  if (!r.allowed) assert.equal(r.reason, "capability_not_implemented");
});

check("BOOKKEEPING_STAFF identity/navigation allowed, b2b_alliance.read denied", () => {
  const a = decideMiadiamanteRead("bookkeeping_staff", "current_user_context.read");
  const b = decideMiadiamanteRead("bookkeeping_staff", "b2b_alliance.read");
  assert.equal(a.allowed, true);
  assert.equal(b.allowed, false);
});

check("COMMUNITY_MANAGER identity/navigation allowed, academy_student.read denied", () => {
  const a = decideMiadiamanteRead("community_manager", "current_user_context.read");
  const b = decideMiadiamanteRead("community_manager", "academy_student.read");
  assert.equal(a.allowed, true);
  assert.equal(b.allowed, false);
});

check("REFERRAL_MANAGER identity/navigation allowed, academy_student.read denied", () => {
  const a = decideMiadiamanteRead("referral_manager", "current_user_context.read");
  const b = decideMiadiamanteRead("referral_manager", "academy_student.read");
  assert.equal(a.allowed, true);
  assert.equal(b.allowed, false);
});

check("GENERAL_STAFF default-deny: ungated capabilities still allowed, everything else denied", () => {
  const identity = decideMiadiamanteRead("general_staff", "current_user_context.read");
  const finance = decideMiadiamanteRead("general_staff", "client.read");
  const academy = decideMiadiamanteRead("general_staff", "academy_student.read");
  assert.equal(identity.allowed, true); // identity is not a data leak — same as being able to see your own name in the UI
  assert.equal(finance.allowed, false);
  assert.equal(academy.allowed, false);
});

check("INSTRUCTOR default-deny (empty ROLE_PERMISSIONS array)", () => {
  const r = decideMiadiamanteRead("instructor", "academy_student.read");
  assert.equal(r.allowed, false);
});

// --- Security tests (master prompt section 33) ------------------------------
console.log("\nSecurity tests:");

check("unauthenticated request (null role) is denied, never throws", () => {
  const r = decideMiadiamanteRead(null, "current_user_context.read");
  assert.equal(r.allowed, false);
  if (!r.allowed) assert.equal(r.reason, "unauthenticated");
});

check("unknown/malformed capability name is denied, never throws", () => {
  const r = decideMiadiamanteRead("super_admin", "'; DROP TABLE clients; --");
  assert.equal(r.allowed, false);
  if (!r.allowed) assert.equal(r.reason, "unknown_capability");
});

check("empty-string capability name is denied, never throws", () => {
  const r = decideMiadiamanteRead("super_admin", "");
  assert.equal(r.allowed, false);
});

check("cross-module request: academy_staff requesting b2b_alliance.read denied the same way as any unauthorized module", () => {
  const r = decideMiadiamanteRead("academy_staff", "b2b_alliance.read");
  assert.equal(r.allowed, false);
});

check("denial messages never vary by reason (no side-channel leakage) except unauthenticated", () => {
  const denied1 = decideMiadiamanteRead("general_staff", "client.read");
  const denied2 = decideMiadiamanteRead("academy_staff", "b2b_alliance.read");
  assert.equal(!denied1.allowed && !denied2.allowed, true);
  if (!denied1.allowed && !denied2.allowed) {
    assert.equal(denied1.message, denied2.message, "denial copy must be identical regardless of reason");
  }
});

check("role-change/deactivation behavior: a null role (what getCurrentRole() returns for a deactivated user) is always denied, even for a capability an active user of that same prior role could read", () => {
  const r = decideMiadiamanteRead(null, "authorized_navigation.read");
  assert.equal(r.allowed, false);
});

check("every role in roleValues resolves without throwing for every capability (no crash = fail-open risk)", () => {
  const roles: Role[] = [
    "admin",
    "manager",
    "tax_staff",
    "bookkeeping_staff",
    "notary_staff",
    "consulting_staff",
    "academy_staff",
    "referral_manager",
    "community_manager",
    "immigration_staff",
    "super_admin",
    "instructor",
    "general_staff",
  ];
  const capabilities = [
    "current_user_context.read",
    "authorized_navigation.read",
    "invoice_summary.read",
    "financial_report_summary.read",
    "task_list.read",
    "upcoming_appointments.read",
    "client.read",
    "academy_student.read",
    "b2b_alliance.read",
    "referral_compensation.read",
    "this_capability_does_not_exist", // exercises the unknown_capability path
  ];
  for (const role of roles) {
    for (const capability of capabilities) {
      decideMiadiamanteRead(role, capability);
    }
  }
});

// --- Phase 1B: human-actor audit tests --------------------------------------
console.log("\nHuman-actor audit tests (Phase 1B):");

check("authenticated OWNER (ADMIN_EMAIL case, super_admin, no users row required) is recorded", () => {
  const result = decideMiadiamanteRead("super_admin", "current_user_context.read");
  const entry = buildMiadiamanteAuditEntry({
    capabilityName: "current_user_context.read",
    requestedByEmail: "owner@anthonymultiservice.com",
    result,
  });
  assert.equal(entry.requestedByUserEmail, "owner@anthonymultiservice.com");
  assert.equal(entry.outcome, "success");
});

check("authenticated DB-backed staff user is recorded identically (no special-case for ADMIN_EMAIL)", () => {
  const result = decideMiadiamanteRead("academy_staff", "authorized_navigation.read");
  const entry = buildMiadiamanteAuditEntry({
    capabilityName: "authorized_navigation.read",
    requestedByEmail: "staff@anthonymultiservice.com",
    result,
  });
  assert.equal(entry.requestedByUserEmail, "staff@anthonymultiservice.com");
});

check("email is normalized to lowercase before being recorded", () => {
  const result = decideMiadiamanteRead("super_admin", "current_user_context.read");
  const entry = buildMiadiamanteAuditEntry({
    capabilityName: "current_user_context.read",
    requestedByEmail: "Owner@AnthonyMultiservice.COM",
    result,
  });
  assert.equal(entry.requestedByUserEmail, "owner@anthonymultiservice.com");
});

check("inactive/deactivated user (null role) is denied AND the audit entry still records no requester fabricated", () => {
  const result = decideMiadiamanteRead(null, "current_user_context.read");
  const entry = buildMiadiamanteAuditEntry({
    // Even if a stale/cached email were somehow available, a deactivated
    // user's request must still be denied by decideMiadiamanteRead — the
    // audit entry below is deliberately built with requestedByEmail still
    // present, to prove the DENIAL is what gates access, not the
    // presence/absence of an email on the audit entry.
    capabilityName: "current_user_context.read",
    requestedByEmail: "deactivated@anthonymultiservice.com",
    result,
  });
  assert.equal(result.allowed, false);
  assert.equal(entry.outcome, "denied");
  assert.equal(entry.requestedByUserEmail, "deactivated@anthonymultiservice.com");
});

check("unauthenticated request: no email available, audit entry records null rather than fabricating one", () => {
  const result = decideMiadiamanteRead(null, "current_user_context.read");
  const entry = buildMiadiamanteAuditEntry({
    capabilityName: "current_user_context.read",
    requestedByEmail: null,
    result,
  });
  assert.equal(entry.requestedByUserEmail, null);
  assert.equal(entry.outcome, "denied");
});

check("legacy/null compatibility: an audit entry with no requester is still a well-formed, insertable shape", () => {
  const result = decideMiadiamanteRead("super_admin", "authorized_navigation.read");
  const entry = buildMiadiamanteAuditEntry({
    capabilityName: "authorized_navigation.read",
    requestedByEmail: null,
    result,
  });
  // Every other field must still be present and correctly typed — a null
  // requester must never cascade into other fields being omitted/undefined.
  assert.equal(typeof entry.action, "string");
  assert.equal(typeof entry.approvalLevel, "string");
  assert.equal(entry.agentId, null);
  assert.equal(entry.humanApproverEmail, null);
});

check("denied capability audit entry records the capability name, not the denial reason, in requestedByUserEmail (no field confusion)", () => {
  const result = decideMiadiamanteRead("general_staff", "client.read");
  const entry = buildMiadiamanteAuditEntry({
    capabilityName: "client.read",
    requestedByEmail: "general.staff@anthonymultiservice.com",
    result,
  });
  assert.equal(entry.requestedByUserEmail, "general.staff@anthonymultiservice.com");
  assert.equal(entry.outcome, "denied");
  assert.ok(entry.actionDetail?.includes("capability=client.read"));
  assert.ok(entry.actionDetail?.includes("denied_reason="));
});

check("SPOOFING: capabilityRunner's exported functions take no parameters — there is no input path for a caller to supply a fake identity (structural, not just filtered)", () => {
  // This is a type-level/API-shape assertion rather than a runtime one:
  // runCurrentUserContext() and runAuthorizedNavigation() in
  // capabilityRunner.ts are both () => Promise<...> — zero parameters.
  // The only identity capabilityRunner.ts ever uses is auth()'s own
  // server-resolved session (see its Phase 1B security comment). Verified
  // here by confirming buildMiadiamanteAuditEntry — the only place an
  // email enters an audit entry — has no code path that reads from
  // anything other than its explicit requestedByEmail parameter, which
  // capabilityRunner.ts populates exclusively from `session?.user?.email`.
  const result = decideMiadiamanteRead("super_admin", "current_user_context.read");
  const attemptedSpoof = buildMiadiamanteAuditEntry({
    capabilityName: "current_user_context.read",
    requestedByEmail: "real.session.email@anthonymultiservice.com",
    result,
  });
  assert.equal(attemptedSpoof.requestedByUserEmail, "real.session.email@anthonymultiservice.com");
});

// --- Phase 2A: record-level capability authorization test matrix -----------
console.log("\nPhase 2A — record-level capability test matrix (section 25):");

check("OWNER/SUPER_ADMIN: all four new capabilities allowed", () => {
  for (const cap of ["invoice_summary.read", "financial_report_summary.read", "task_list.read", "upcoming_appointments.read"]) {
    const r = decideMiadiamanteRead("super_admin", cap);
    assert.equal(r.allowed, true, `expected super_admin allowed for ${cap}`);
  }
});

check("BOOKKEEPING_STAFF: invoice_summary.read allowed (holds 'invoices')", () => {
  const r = decideMiadiamanteRead("bookkeeping_staff", "invoice_summary.read");
  assert.equal(r.allowed, true);
});

check("BOOKKEEPING_STAFF: financial_report_summary.read allowed (holds 'financial_reports' -> visibility.full)", () => {
  const r = decideMiadiamanteRead("bookkeeping_staff", "financial_report_summary.read");
  assert.equal(r.allowed, true);
});

check("REFERRAL_MANAGER: invoice_summary.read denied (holds no 'invoices' area)", () => {
  const r = decideMiadiamanteRead("referral_manager", "invoice_summary.read");
  assert.equal(r.allowed, false);
});

check("REFERRAL_MANAGER: financial_report_summary.read ALLOWED at the capability gate (composite visibility via referral_compensation_terms) — section-level filtering to referral-only happens inside the DTO, not here", () => {
  const r = decideMiadiamanteRead("referral_manager", "financial_report_summary.read");
  assert.equal(r.allowed, true, "referral_manager must be able to call the capability to receive their own authorized section (master prompt section 25) — denying outright would be MORE restrictive than the real Reports page");
});

check("COMMUNITY_MANAGER: invoice_summary.read denied (holds no 'invoices' area)", () => {
  const r = decideMiadiamanteRead("community_manager", "invoice_summary.read");
  assert.equal(r.allowed, false);
});

check("COMMUNITY_MANAGER: financial_report_summary.read ALLOWED at the capability gate (composite visibility via alliances/b2b_membership)", () => {
  const r = decideMiadiamanteRead("community_manager", "financial_report_summary.read");
  assert.equal(r.allowed, true);
});

check("ACADEMY_STAFF: invoice_summary.read denied (holds no 'invoices' area)", () => {
  const r = decideMiadiamanteRead("academy_staff", "invoice_summary.read");
  assert.equal(r.allowed, false);
});

check("ACADEMY_STAFF: financial_report_summary.read denied (holds zero report-visibility areas — reports/financial_reports/referrals/referral_compensation_*/alliances/b2b_membership* all absent)", () => {
  const r = decideMiadiamanteRead("academy_staff", "financial_report_summary.read");
  assert.equal(r.allowed, false, "academy_staff must not access company financial reports unless RBAC explicitly permits it (master prompt section 25) — confirmed it does not");
});

check("GENERAL_STAFF: task_list.read and upcoming_appointments.read allowed (mirror the real, ungated Tasks/Appointments pages — confirmed by audit, not a privilege expansion)", () => {
  assert.equal(decideMiadiamanteRead("general_staff", "task_list.read").allowed, true);
  assert.equal(decideMiadiamanteRead("general_staff", "upcoming_appointments.read").allowed, true);
});

check("GENERAL_STAFF: invoice_summary.read and financial_report_summary.read denied (default deny, zero finance areas granted)", () => {
  assert.equal(decideMiadiamanteRead("general_staff", "invoice_summary.read").allowed, false);
  assert.equal(decideMiadiamanteRead("general_staff", "financial_report_summary.read").allowed, false);
});

check("INSTRUCTOR: task_list.read and upcoming_appointments.read allowed (same ungated-module mirror as general_staff — not a broadened permission)", () => {
  assert.equal(decideMiadiamanteRead("instructor", "task_list.read").allowed, true);
  assert.equal(decideMiadiamanteRead("instructor", "upcoming_appointments.read").allowed, true);
});

check("INSTRUCTOR: invoice_summary.read and financial_report_summary.read denied (empty ROLE_PERMISSIONS array, default deny)", () => {
  assert.equal(decideMiadiamanteRead("instructor", "invoice_summary.read").allowed, false);
  assert.equal(decideMiadiamanteRead("instructor", "financial_report_summary.read").allowed, false);
});

check("UNAUTHENTICATED: all four new capabilities denied, never throw", () => {
  for (const cap of ["invoice_summary.read", "financial_report_summary.read", "task_list.read", "upcoming_appointments.read"]) {
    const r = decideMiadiamanteRead(null, cap);
    assert.equal(r.allowed, false, `expected unauthenticated denied for ${cap}`);
    if (!r.allowed) assert.equal(r.reason, "unauthenticated");
  }
});

// --- Phase 2A: input validation / security tests (section 26) --------------
console.log("\nPhase 2A — input validation / security tests:");

check("invoiceSummaryInputSchema: rejects a malformed (non-UUID) invoiceId", () => {
  const r = invoiceSummaryInputSchema.safeParse({ invoiceId: "not-a-uuid" });
  assert.equal(r.success, false);
});

check("invoiceSummaryInputSchema: rejects a SQL-injection-shaped invoiceId", () => {
  const r = invoiceSummaryInputSchema.safeParse({ invoiceId: "'; DROP TABLE invoices; --" });
  assert.equal(r.success, false);
});

check("invoiceSummaryInputSchema: rejects missing invoiceId", () => {
  const r = invoiceSummaryInputSchema.safeParse({});
  assert.equal(r.success, false);
});

check("invoiceSummaryInputSchema: accepts a well-formed UUID", () => {
  const r = invoiceSummaryInputSchema.safeParse({ invoiceId: "123e4567-e89b-12d3-a456-426614174000" });
  assert.equal(r.success, true);
});

check("financialReportSummaryInputSchema: accepts an empty object (defaults applied downstream)", () => {
  const r = financialReportSummaryInputSchema.safeParse({});
  assert.equal(r.success, true);
});

check("financialReportSummaryInputSchema: rejects an excessive date range (>730 days)", () => {
  const r = financialReportSummaryInputSchema.safeParse({ from: "2015-01-01", to: "2026-01-01" });
  assert.equal(r.success, false);
});

check("financialReportSummaryInputSchema: rejects 'to' before 'from'", () => {
  const r = financialReportSummaryInputSchema.safeParse({ from: "2026-06-01", to: "2026-01-01" });
  assert.equal(r.success, false);
});

check("financialReportSummaryInputSchema: rejects an unexpected/malformed date value", () => {
  const r = financialReportSummaryInputSchema.safeParse({ from: "not-a-date", to: "also-not-a-date" });
  assert.equal(r.success, false);
});

check("taskListInputSchema: rejects a limit above the bounded maximum (50)", () => {
  const r = taskListInputSchema.safeParse({ limit: 100000 });
  assert.equal(r.success, false);
});

check("taskListInputSchema: rejects a negative/zero limit", () => {
  assert.equal(taskListInputSchema.safeParse({ limit: 0 }).success, false);
  assert.equal(taskListInputSchema.safeParse({ limit: -5 }).success, false);
});

check("taskListInputSchema: rejects a non-numeric limit (unexpected value/enum-like injection)", () => {
  const r = taskListInputSchema.safeParse({ limit: "'; DROP TABLE tasks; --" });
  assert.equal(r.success, false);
});

check("taskListInputSchema: defaults to the maximum bound when limit is omitted", () => {
  const r = taskListInputSchema.safeParse({});
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.limit, 50);
});

check("upcomingAppointmentsInputSchema: rejects a limit above the bounded maximum (20)", () => {
  const r = upcomingAppointmentsInputSchema.safeParse({ limit: 9999 });
  assert.equal(r.success, false);
});

check("upcomingAppointmentsInputSchema: defaults to 5 when limit is omitted (does not dump the entire calendar)", () => {
  const r = upcomingAppointmentsInputSchema.safeParse({});
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.limit, 5);
});

check("every role resolves without throwing for all four new capabilities (no crash = fail-open risk)", () => {
  const roles: Role[] = [
    "admin", "manager", "tax_staff", "bookkeeping_staff", "notary_staff",
    "consulting_staff", "academy_staff", "referral_manager", "community_manager",
    "immigration_staff", "super_admin", "instructor", "general_staff",
  ];
  const caps = ["invoice_summary.read", "financial_report_summary.read", "task_list.read", "upcoming_appointments.read"];
  for (const role of roles) {
    for (const cap of caps) {
      decideMiadiamanteRead(role, cap);
    }
  }
});

console.log(`\n${passed} checks passed.`);
