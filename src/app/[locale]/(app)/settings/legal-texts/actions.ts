"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { legalTexts } from "@/lib/db/schema";
import { logAuditEvent } from "@/lib/audit";
import { requireAccessArea } from "@/lib/permissions";
import { LEGAL_TEXT_KEYS } from "@/lib/legal/texts";

const legalTextsFormSchema = z.object(
  Object.fromEntries(
    LEGAL_TEXT_KEYS.map((key) => [
      key,
      z.object({ en: z.string().trim().max(4000), es: z.string().trim().max(4000) }),
    ]),
  ) as Record<(typeof LEGAL_TEXT_KEYS)[number], z.ZodObject<{ en: z.ZodString; es: z.ZodString }>>,
);

export type LegalTextsFormValues = z.input<typeof legalTextsFormSchema>;

export async function saveLegalTextsAction(rawValues: LegalTextsFormValues) {
  await requireAccessArea("settings");
  const values = legalTextsFormSchema.parse(rawValues);
  const updatedByEmail = (await auth())?.user?.email ?? null;
  const now = new Date();

  const rows = LEGAL_TEXT_KEYS.map((key) => ({
    key,
    textEn: values[key].en,
    textEs: values[key].es,
    updatedAt: now,
    updatedByEmail,
  }));
  for (const row of rows) {
    await getDb()
      .insert(legalTexts)
      .values(row)
      .onConflictDoUpdate({
        target: legalTexts.key,
        set: { textEn: row.textEn, textEs: row.textEs, updatedAt: now, updatedByEmail },
      });
  }

  await logAuditEvent({
    action: "legal_texts.updated",
    entityType: "legal_texts",
    entityId: "all",
    summary: "Legal / disclosure texts updated in Settings",
  });

  revalidatePath("/settings/legal-texts");
  revalidatePath("/book");
  revalidatePath("/portal");
}
