import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { websiteLinks } from "@/lib/db/schema";

export async function listWebsiteLinks() {
  return getDb().select().from(websiteLinks).orderBy(asc(websiteLinks.sortOrder));
}

export async function listActiveWebsiteLinks() {
  return getDb()
    .select()
    .from(websiteLinks)
    .where(eq(websiteLinks.active, true))
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
