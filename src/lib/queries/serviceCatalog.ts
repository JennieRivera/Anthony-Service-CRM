import { eq, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { serviceCatalogItems } from "@/lib/db/schema";

export async function listServiceCatalogItems() {
  return getDb()
    .select()
    .from(serviceCatalogItems)
    .orderBy(asc(serviceCatalogItems.sortOrder), asc(serviceCatalogItems.name));
}

// For CaseForm's "pick a service" dropdown — only active items, since a
// deactivated catalog entry shouldn't be offered for new cases anymore
// (existing cases are unaffected either way, there's no FK to this table).
export async function listActiveServiceCatalogItems() {
  return getDb()
    .select()
    .from(serviceCatalogItems)
    .where(eq(serviceCatalogItems.active, true))
    .orderBy(asc(serviceCatalogItems.sortOrder), asc(serviceCatalogItems.name));
}
