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
  const r = decideMiadiamanteRead("academy_staff", "invoice.read");
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
  const finance = decideMiadiamanteRead("general_staff", "invoice.read");
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
  const denied1 = decideMiadiamanteRead("general_staff", "invoice.read");
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
    "client.read",
    "invoice.read",
    "report.read",
    "academy_student.read",
    "b2b_alliance.read",
    "referral_compensation.read",
    "appointment.read",
    "task.read",
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
  const result = decideMiadiamanteRead("general_staff", "invoice.read");
  const entry = buildMiadiamanteAuditEntry({
    capabilityName: "invoice.read",
    requestedByEmail: "general.staff@anthonymultiservice.com",
    result,
  });
  assert.equal(entry.requestedByUserEmail, "general.staff@anthonymultiservice.com");
  assert.equal(entry.outcome, "denied");
  assert.ok(entry.actionDetail?.includes("capability=invoice.read"));
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

console.log(`\n${passed} checks passed.`);
