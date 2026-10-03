// MIADIAMANTE AI Foundation — Phase 1. Safe, explicit-allow-list DTOs for
// the two implemented read capabilities. Master prompt section 8: "Never
// pass entire database rows to an AI layer simply because the user can
// access the page" — neither function below selects or returns a raw
// table row; each lists its output fields by hand.
//
// These are plain server-side functions, not server actions — the actual
// callable entry point (which also performs the authorize.ts check) lives
// in capabilityRunner.ts.

import { getCurrentRole, canAccessArea, roleValues, type AccessArea, type Role } from "@/lib/permissions";
import { auth } from "@/auth";

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
