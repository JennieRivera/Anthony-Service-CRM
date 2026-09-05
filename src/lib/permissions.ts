// Phase 2, Session 7 — RBAC design reference.
//
// This map is NOT enforced anywhere yet. Sign-in is still restricted to
// the single ADMIN_EMAIL (src/auth.ts) by explicit decision when this was
// built — multi-staff Google login and a "Staff Accounts" management UI
// would need to ship first. `users.role` exists in the schema (reserved,
// unpopulated) for when that happens.
//
// Categories with no dedicated role in the 9-role list (Credit Services,
// Business Formation, Marketing/Automation, Immigration, and the legacy
// Document Prep/apostille category) are restricted to admin/manager only,
// per an explicit decision — not silently guessed.

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
] as const;

export type Role = (typeof roleValues)[number];

// Matches cases.serviceType values, plus the two standalone modules
// (referrals, alliances) that aren't cases at all.
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
  | "alliances";

export const ROLE_PERMISSIONS: Record<Role, AccessArea[] | "*"> = {
  admin: "*",
  manager: "*",
  tax_staff: ["tax_prep"],
  bookkeeping_staff: ["bookkeeping"],
  notary_staff: ["notary", "online_notary"],
  consulting_staff: ["leadership"],
  academy_staff: ["academy"],
  referral_manager: ["referrals"],
  community_manager: ["alliances"],
};

export function canAccessArea(role: Role, area: AccessArea): boolean {
  const allowed = ROLE_PERMISSIONS[role];
  return allowed === "*" || allowed.includes(area);
}

// Phase 4, Session 7 — "Communication Security" role rules (spec #13),
// layered on the same unenforced design as the rest of this file (still no
// multi-staff login, so nothing here runs against a real request yet).
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
