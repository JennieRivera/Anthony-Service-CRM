import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { messageTemplates } from "@/lib/db/schema";

export async function listMessageTemplates() {
  return getDb()
    .select()
    .from(messageTemplates)
    .orderBy(desc(messageTemplates.updatedAt));
}

export async function getMessageTemplateById(id: string) {
  const [row] = await getDb()
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.id, id))
    .limit(1);
  return row ?? null;
}

// Used by the "suggested template" prompt on a case's status change —
// finds the single best-matching active template for a category/language,
// preferring one that also matches the given channel.
export async function findActiveTemplate(
  category: (typeof messageTemplates.$inferSelect)["category"],
  language: "en" | "es",
) {
  const rows = await getDb()
    .select()
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.category, category),
        eq(messageTemplates.language, language),
        eq(messageTemplates.active, true),
      ),
    )
    .orderBy(desc(messageTemplates.updatedAt));

  return rows[0] ?? null;
}
