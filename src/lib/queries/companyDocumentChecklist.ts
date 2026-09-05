import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { companyDocumentChecklistItems } from "@/lib/db/schema";

export async function listCompanyDocumentChecklistItems(companyId: string) {
  return getDb()
    .select()
    .from(companyDocumentChecklistItems)
    .where(eq(companyDocumentChecklistItems.companyId, companyId))
    .orderBy(desc(companyDocumentChecklistItems.createdAt));
}
