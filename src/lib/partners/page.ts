import { redirect } from "@/i18n/navigation";
import type { PortalDb } from "@/lib/portal/db";
import { hasPartnerConsent } from "./queries";
import { getPartnerSession, partnerDb } from "./session";

// Every signed-in partner PAGE calls this itself (a layout's check alone
// doesn't protect a page in the App Router). No session → the access page.
// Terms or "not a law firm" not yet accepted → null, and the page renders
// nothing (the layout shows the acceptance gate instead).
export async function requirePartnerPage(locale: string): Promise<{ allianceId: string; db: PortalDb } | null> {
  const session = await getPartnerSession();
  if (!session) {
    redirect({ href: "/partners/access", locale });
    return null;
  }
  const db = partnerDb();
  if (!(await hasPartnerAccepted(db, session.allianceId))) return null;
  return { allianceId: session.allianceId, db };
}

export async function hasPartnerAccepted(db: PortalDb, allianceId: string) {
  const [terms, notice] = await Promise.all([
    hasPartnerConsent(db, allianceId, "partner_terms"),
    hasPartnerConsent(db, allianceId, "not_a_law_firm"),
  ]);
  return terms && notice;
}
