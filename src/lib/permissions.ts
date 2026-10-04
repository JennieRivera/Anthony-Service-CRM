// Phase 2, Session 7 — RBAC design reference. Extended in Phase 5,
// Session 8 to add the Immigration Staff role and cover every module
// added across Phase 5 (spec section 17).
//
// Phase 2H — this map was, until now, NOT enforced anywhere (see the
// git history of this comment). It is now the real authorization layer:
// requireAccessArea()/hasAccessArea() below are called from Server
// Actions and pages. Sign-in is still restricted to the single
// ADMIN_EMAIL (src/auth.ts) — there is still no multi-staff Google login
// or "Staff Accounts" UI, so today the ONLY identity that can ever
// authenticate resolves to "super_admin" (see getCurrentRole). Every
// other role below is real, testable, enforced code — but currently
// unreachable by any live session, by design, until multi-staff login
// ships. `users.role` exists in the schema (reserved, unpopulated) for
// when that happens; this phase deliberately does not populate it (see
// the Phase 2H report, section D, for why no schema change was needed).
//
// Categories with no dedicated role (Credit Services, Business Formation,
// Marketing/Automation, and the legacy Document Prep/apostille category)
// are restricted to admin/manager only, per an explicit decision — not
// silently guessed. Company Master Registry access is granted per spec
// section 17's own wording ("Bookkeeping Staff: ... company financial
// profile", "Consulting Staff: business and company strategy") rather
// than opened to every role.

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import { users } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/audit";

export const roleValues = [
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
  // Phase 2H additions — see section E of the Phase 2H report for exactly
  // why each exists and how (or whether) it can be reached today.
  "super_admin",
  "instructor",
  "general_staff",
] as const;

export type Role = (typeof roleValues)[number];

// Matches cases.serviceType values, plus the standalone modules
// (referrals, alliances, companies, associations) and reference
// directories (irs_resources, immigration_forms) that aren't cases at
// all.
//
// Phase 2H additions below the original list are deliberately NOT a
// second parallel module system — "academy" still covers everything the
// Academy Staff role already had (Students, Programs, Courses,
// Instructors, Mentors, Progress marking, Attendance marking, Evaluation
// grading). The new areas are either genuinely new modules this phase's
// audit found had no area at all (documents, invoices, payments,
// financial_reports, diamond_community, ai_team, ai_escalations,
// professional_systems, websites, reports, settings, security_audit,
// user_role_administration) or deliberately SEPARATE, narrower
// permissions carved out of "academy" for the two things section 5/13
// named as needing independent, explicit protection: issuing/revoking a
// certificate (academy_certificates), and the four cross-cutting
// sections Student 360 surfaces from OTHER modules (student360_finance/
// _documents/_communications/_calendar) — an Academy Staff role having
// "academy" must NOT silently imply any of those four.
export type AccessArea =
  | "notary"
  | "online_notary"
  | "tax_prep"
  | "bookkeeping"
  | "immigration"
  | "credit_financing"
  | "leadership"
  | "company_registration"
  | "academy"
  | "marketing"
  | "document_prep"
  | "referrals"
  | "alliances"
  // Phase 5 additions (Sessions 1-8)
  | "companies"
  | "sales_tax"
  | "irs_administrative"
  | "irs_resources"
  | "immigration_forms"
  | "associations"
  // Phase 2H additions
  | "documents"
  | "invoices"
  | "payments"
  | "financial_reports"
  | "academy_certificates"
  | "diamond_community"
  | "ai_team"
  | "ai_escalations"
  | "professional_systems"
  | "websites"
  | "reports"
  | "settings"
  | "security_audit"
  | "user_role_administration"
  | "student360_finance"
  | "student360_documents"
  | "student360_communications"
  | "student360_calendar"
  // Referrals & Commissions Foundation — deliberately separate from
  // "referrals" (viewing/creating/editing a referral and its legacy
  // commission fields, unchanged from before this phase) and from
  // "invoices"/"payments" (customer-facing finance): approving a
  // compensation amount or recording a payout to a referrer is its own
  // sensitive financial action, and referral_manager having "referrals"
  // or bookkeeping_staff having "invoices"/"payments" must never imply
  // any of the three areas below.
  //
  // RBAC correction (post-report section AG) — the original single
  // "referral_compensation" wildcard-only area has been split into three,
  // matching the three business-distinct actions the brief's correction
  // named explicitly, each independently least-privileged:
  //   - referral_compensation_terms    — describing/editing the
  //     arrangement (compensation type, rate/amount, base, earning
  //     trigger, partial-payment rule) and marking it Earned once that
  //     trigger is actually satisfied. Granted to referral_manager: this
  //     is the compensation half of running a referral day to day, the
  //     same way "referrals" already covers the rest of it.
  //   - referral_compensation_approval — approving an Earned compensation
  //     and setting the Approved amount. Deliberately granted to NO
  //     narrow role (same "report the gap, minimum necessary" judgment
  //     call as before) — only super_admin/admin/manager have it, via
  //     "*". A referral_manager being able to both configure terms AND
  //     approve the amount they configured would collapse an intended
  //     separation of duties; bookkeeping_staff approving its own payout
  //     authorization would do the same from the other side.
  //   - referral_compensation_payment  — recording and reversing a
  //     payment against an already-Approved compensation. Granted to
  //     bookkeeping_staff: this is the payout half of their existing
  //     invoices/payments finance work, scoped narrowly so it implies
  //     nothing about editing terms, marking Earned, or approving.
  // hasReferralViewAccess() below is what lets a role reach the existing
  // referral list/detail pages on the strength of any one of these three
  // (or "referrals") without duplicating that UI into a second page.
  | "referral_compensation_terms"
  | "referral_compensation_approval"
  | "referral_compensation_payment"
  // B2B Memberships & Benefits — split the same way, for the same
  // separation-of-duties reason as the referral compensation areas
  // above, and deliberately NOT implied by any existing area:
  // "alliances" (the B2B relationship itself) must never imply
  // membership administration, and "invoices"/"payments"/"bookkeeping"
  // must never imply it either.
  //   - b2b_membership         — full membership administration: create/
  //     edit plans, create/edit benefits, assign/change/pause/cancel an
  //     alliance's membership, mark a fee complimentary/waived. Granted
  //     to community_manager (the existing B2B operational role) — this
  //     is the membership half of running B2B relationships day to day,
  //     the same way "alliances" already covers the relationship half.
  //   - b2b_membership_billing — narrow: view membership/benefit
  //     information and link/unlink an existing Invoice to a membership.
  //     Granted to bookkeeping_staff — the billing half of their
  //     existing invoices/payments finance work, scoped so it implies
  //     nothing about editing plans, benefits, or an alliance's
  //     membership status/terms.
  | "b2b_membership"
  | "b2b_membership_billing";

// "*" = every area, used only by the two roles with no narrower business
// meaning. Every other role is an explicit array — "default deny when a
// permission is not explicitly granted" means a role granted NOTHING
// below ends up with an empty array, not a fallthrough to some other
// role's list.
export const ROLE_PERMISSIONS: Record<Role, AccessArea[] | "*"> = {
  // super_admin and admin currently resolve to identical access — see
  // the Phase 2H report section H for why they're still kept as two
  // distinct roles despite that (who can be assigned which, and how, is
  // the real distinction once multi-staff login and a role-admin UI
  // exist — not a difference in what either can see today).
  super_admin: "*",
  admin: "*",
  manager: "*",
  // "Tax Staff: tax, EIN, sales tax" (spec section 17)
  tax_staff: ["tax_prep", "sales_tax", "irs_administrative", "irs_resources"],
  // "Bookkeeping Staff: bookkeeping and company financial profile" —
  // Phase 2H: also the CRM's "Finance Staff" concept (section 2's
  // required role list uses that name; this existing enum value is kept
  // rather than duplicated — see the Phase 2H report section E).
  bookkeeping_staff: [
    "bookkeeping",
    "companies",
    "invoices",
    "payments",
    "financial_reports",
    "student360_finance",
    // RBAC correction — payout half of referral compensation only; see
    // the AccessArea comment above for why terms/earned/approval are
    // deliberately excluded.
    "referral_compensation_payment",
    // B2B Memberships & Benefits — billing half only; see the
    // AccessArea comment above for why plan/benefit/membership-status
    // administration is deliberately excluded.
    "b2b_membership_billing",
  ],
  notary_staff: ["notary", "online_notary"],
  // "Consulting Staff: business and company strategy"
  consulting_staff: ["leadership", "companies"],
  // Academy Staff gets the Academy module and certificate issuance (a
  // normal part of running the Academy day to day), and the three
  // non-financial Student 360 cross-sections an academy coordinator
  // genuinely needs (documents, communications, calendar) — but
  // deliberately NEVER student360_finance. See Phase 2H report section I.
  academy_staff: [
    "academy",
    "academy_certificates",
    "student360_documents",
    "student360_communications",
    "student360_calendar",
  ],
  // RBAC correction — terms/earning half of referral compensation; see
  // the AccessArea comment above for why approval/payment are deliberately
  // excluded.
  referral_manager: ["referrals", "referral_compensation_terms"],
  // "Community Manager: associations and chambers" — plus full B2B
  // Membership administration (RBAC correction-style split: membership
  // billing/linking alone goes to bookkeeping_staff above, not here).
  community_manager: ["alliances", "associations", "b2b_membership"],
  // "Immigration Staff: immigration administrative cases only" — cases,
  // the Immigration Forms Library, and per-case document folders (which
  // live on the immigration case's own documents, so no separate area).
  immigration_staff: ["immigration", "immigration_forms"],
  // Phase 2H — see report section K for exactly why this is empty today:
  // there is no real, enforceable relationship between an authenticated
  // user and a specific academyInstructors row, so this role grants
  // nothing rather than guessing one from a name/email match.
  instructor: [],
  // Phase 2H — "only explicitly permitted areas" (spec section 2,
  // required role #6). A brand-new General Staff account starts with
  // zero access until an admin explicitly grants specific areas (not
  // possible through any UI yet — see report section Q).
  general_staff: [],
};

// Pre-release adjustment (Phase 2H final) — "user_role_administration" is
// deliberately carved out of the "*" wildcard instead of being folded into
// it like every other area. Before this, manager inherited it purely as a
// side effect of sharing "*" with super_admin/admin — never a deliberate
// decision. Role/user administration is powerful enough (it can authorize
// new logins and change what any staff member can do) that it is scoped to
// exactly super_admin and admin, explicitly, regardless of what any other
// role's wildcard would otherwise imply. manager keeps every other "*"
// permission unchanged — this is the one named exception, not a redesign.
export function canAccessArea(role: Role, area: AccessArea): boolean {
  if (area === "user_role_administration") {
    return role === "super_admin" || role === "admin";
  }
  const allowed = ROLE_PERMISSIONS[role];
  return allowed === "*" || allowed.includes(area);
}

// Alias kept for readability at call sites that are checking (not
// enforcing) — identical behavior to canAccessArea.
export const hasAccessArea = canAccessArea;

// RBAC correction — a role may reach the existing referral list/detail
// pages on the strength of ANY ONE of the four referral-related areas,
// even though only "referrals" itself authorizes creating/editing the
// referral record (createReferralAction/updateReferralAction still check
// "referrals" alone). This is what lets Bookkeeping Staff, who holds only
// referral_compensation_payment, view a referral to find and pay an
// Approved compensation without a second, duplicate referrals page or
// view — "do not duplicate the referral UI" from the correction brief.
export function hasReferralViewAccess(role: Role): boolean {
  return (
    canAccessArea(role, "referrals") ||
    canAccessArea(role, "referral_compensation_terms") ||
    canAccessArea(role, "referral_compensation_approval") ||
    canAccessArea(role, "referral_compensation_payment")
  );
}

// B2B Memberships & Benefits — same reasoning as hasReferralViewAccess
// above: a role may reach the existing alliance detail page (where the
// Membership section lives, per the brief's "extend the existing
// profile, don't duplicate it") on the strength of EITHER "alliances"
// or either membership area, even though only "alliances" itself
// authorizes editing the alliance record. This is what lets Bookkeeping
// Staff, who holds only b2b_membership_billing, open an alliance to
// link an invoice to its membership without a second, duplicate page.
export function hasAllianceViewAccess(role: Role): boolean {
  return (
    canAccessArea(role, "alliances") ||
    canAccessArea(role, "b2b_membership") ||
    canAccessArea(role, "b2b_membership_billing")
  );
}

// Financial & Reporting Relationships — same composition pattern as
// hasReferralViewAccess/hasAllianceViewAccess above, reusing existing
// AccessAreas rather than adding new ones (per the phase brief's "if
// financial_reports is sufficient, reuse it; otherwise minimum additive"
// instruction — composition over the existing areas turned out to be
// sufficient).
//   - full: the whole Reports page, every section (Owner/Admin/Manager
//     via "*", or "financial_reports"/"reports" explicitly).
//   - referral: Referral Performance + Referral Compensation sections
//     only — granted to anyone holding any referral-related area, so
//     Referral Manager sees referral operational numbers without seeing
//     company-wide billing.
//   - b2b: B2B Alliance Performance + Membership Financials sections
//     only — granted to anyone holding any alliance/membership area, so
//     Community Manager sees B2B operational numbers without seeing
//     company-wide billing.
// A role with none of these (Academy Staff, General Staff, Instructor,
// service-specific staff) gets no Reports access at all — default deny.
export function getReportsVisibility(role: Role): {
  full: boolean;
  referral: boolean;
  b2b: boolean;
  any: boolean;
} {
  const full = canAccessArea(role, "reports") || canAccessArea(role, "financial_reports");
  const referral =
    full ||
    canAccessArea(role, "referrals") ||
    canAccessArea(role, "referral_compensation_terms") ||
    canAccessArea(role, "referral_compensation_approval") ||
    canAccessArea(role, "referral_compensation_payment");
  const b2b =
    full ||
    canAccessArea(role, "alliances") ||
    canAccessArea(role, "b2b_membership") ||
    canAccessArea(role, "b2b_membership_billing");
  return { full, referral, b2b, any: full || referral || b2b };
}

// Phase 2H — the owner branch (report section H, "Owner Safety").
// Deliberately NOT a database lookup: the owner's access can never
// depend on a `users` row existing, a migration having run, a down
// database, or any data at all — only on the exact same ADMIN_EMAIL
// comparison src/auth.ts already uses to decide who may sign in at all.
//
// Phase 2H-B — auth.ts's signIn callback now also admits any Google
// account with an active `users` row, so the `else` branch below is no
// longer vacuous. Every permission check (not just sign-in) re-resolves
// the role from that row — not from a JWT-cached value — so disabling a
// user or changing their role takes effect on their very next action,
// not just their next login. A missing row, a null role, an inactive
// row, an unconfigured database, or a thrown query all resolve to null
// (deny) — never an exception out of this function, and never a guess.
export async function getCurrentRole(): Promise<Role | null> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!email) return null;
  if (adminEmail && email === adminEmail) return "super_admin";

  if (!isDatabaseConfigured()) return null;
  try {
    const [record] = await getDb()
      .select({ role: users.role, isActive: users.isActive })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!record || !record.isActive || !record.role) return null;
    return record.role as Role;
  } catch {
    return null;
  }
}

// The real server-side enforcement primitive — throws (never just
// returns false) so a Server Action that forgets to check its result
// can't accidentally proceed. Every denial is audited via the same
// logAuditEvent helper already used elsewhere (no second audit system).
export async function requireAccessArea(area: AccessArea): Promise<Role> {
  const role = await getCurrentRole();
  if (!role || !canAccessArea(role, area)) {
    const session = await auth();
    await logAuditEvent({
      action: "permission.denied",
      entityType: "access_area",
      entityId: area,
      summary: `Access denied to "${area}" for ${session?.user?.email ?? "unauthenticated"} (role: ${role ?? "none"})`,
    });
    throw new Error(`Forbidden: missing "${area}" permission`);
  }
  return role;
}

// Baseline guard for every Server Action whose page isn't gated by a
// specific access area: the caller must resolve to an active role (the
// owner, or an active `users` row) — the exact same population that can
// sign in at all. proxy.ts alone is NOT enough: a Server Action can be
// invoked by POSTing its action ID to any route the proxy lets through
// (e.g. the public /book page), so every action re-checks here itself.
export async function requireAuthenticatedUser(): Promise<Role> {
  const role = await getCurrentRole();
  if (!role) {
    const session = await auth();
    await logAuditEvent({
      action: "permission.denied",
      entityType: "server_action",
      entityId: "authenticated_user",
      summary: `Unauthenticated Server Action call denied for ${session?.user?.email ?? "unauthenticated"}`,
    });
    throw new Error("Unauthorized");
  }
  return role;
}

// Phase 4, Session 7 — "Communication Security" role rules (spec #13),
// layered on the same design as the rest of this file.
//
//   Admin              — full access                         → "*" above
//   Manager            — all business communications          → "*" above
//   Staff (tax/bookkeeping/notary/consulting)
//                      — only their service area's cases,
//                        and only ones assigned to them once
//                        assignedUserId is populated (today every
//                        communication is effectively unassigned,
//                        so the finer "assigned to them" clause is
//                        aspirational until multi-user login ships)
//   Referral Manager   — referral-linked communications only   → ["referrals"]
//   Academy Staff      — academy-linked communications only    → ["academy"]
//   Community Manager  — community/alliance communications     → ["alliances"]
//
// A communication with no case/referral link at all (e.g. a general
// inbound inquiry) has no area and is treated as admin/manager-only below,
// consistent with how the 4 role-less service categories are handled.
export function getCommunicationAccessArea(communication: {
  caseServiceType?: AccessArea | null;
  referralId?: string | null;
}): AccessArea | null {
  if (communication.caseServiceType) return communication.caseServiceType;
  if (communication.referralId) return "referrals";
  return null;
}

export function canAccessCommunication(
  role: Role,
  communication: { caseServiceType?: AccessArea | null; referralId?: string | null },
): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  if (allowed === "*") return true;

  const area = getCommunicationAccessArea(communication);
  return area !== null && allowed.includes(area);
}
