import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { websiteLinks } from "@/lib/db/schema";

export async function listWebsiteLinks() {
  return getDb().select().from(websiteLinks).orderBy(asc(websiteLinks.sortOrder));
}

export async function listActiveWebsiteLinks() {
  return getDb()
    .select()
    .from(websiteLinks)
    // A link toggled off (`active`) or marked "Inactive" via its own status
    // dropdown should both hide it from the Dashboard — those are two
    // separate controls in the Settings UI, and only checking one let a
    // site manually flagged "Inactive" (e.g. a dead domain) keep showing up.
    .where(and(eq(websiteLinks.active, true), ne(websiteLinks.status, "inactive")))
    .orderBy(asc(websiteLinks.sortOrder));
}

export async function getWebsiteLinkById(id: string) {
  const [row] = await getDb()
    .select()
    .from(websiteLinks)
    .where(eq(websiteLinks.id, id))
    .limit(1);
  return row ?? null;
}
