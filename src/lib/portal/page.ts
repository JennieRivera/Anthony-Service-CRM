import { redirect } from "@/i18n/navigation";
import { hasGrantedConsent } from "@/lib/legal/texts";
import { getPortalSession, portalDb } from "./session";
import type { PortalDb } from "./db";

// Every signed-in portal PAGE calls this itself — a layout's checks alone
// don't protect a page in the App Router (layouts and pages render
// independently). No session → the access page. Not yet acknowledged
// "not a law firm" → null, and the page renders nothing (the layout shows
// the acknowledgment gate instead).
export async function requirePortalPage(
  locale: string,
): Promise<{ clientId: string; db: PortalDb } | null> {
  const session = await getPortalSession();
  if (!session) {
    redirect({ href: "/portal/access", locale });
    return null;
  }
  const db = portalDb();
  if (!(await hasGrantedConsent(db, session.clientId, "not_a_law_firm"))) return null;
  return { clientId: session.clientId, db };
}
