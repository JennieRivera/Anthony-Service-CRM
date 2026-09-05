"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { immigrationForms } from "@/lib/db/schema";
import {
  immigrationFormFormSchema,
  type ImmigrationFormFormValues,
} from "@/lib/validation/immigrationForm";
import { logAuditEvent } from "@/lib/audit";

function normalize(values: ImmigrationFormFormValues) {
  return {
    formNumber: values.formNumber,
    formName: values.formName,
    category: values.category,
    officialSource: values.officialSource || null,
    officialUrl: values.officialUrl,
    currentEditionDate: values.currentEditionDate || null,
    editionNotes: values.editionNotes || null,
    filingFeeReference: values.filingFeeReference || null,
    instructionsUrl: values.instructionsUrl || null,
    checklist: values.checklist || null,
    internalNotes: values.internalNotes || null,
    lastVerifiedDate: values.lastVerifiedDate || null,
    active: values.active ?? true,
    updatedAt: new Date(),
  };
}

export async function createImmigrationFormAction(
  rawValues: ImmigrationFormFormValues,
) {
  const values = immigrationFormFormSchema.parse(rawValues);
  const [created] = await getDb()
    .insert(immigrationForms)
    .values(normalize(values))
    .returning({ id: immigrationForms.id });

  await logAuditEvent({
    action: "immigration_form.created",
    entityType: "immigration_form",
    entityId: created.id,
    summary: `Added immigration form "${values.formNumber} — ${values.formName}"`,
  });

  revalidatePath("/immigration-forms");
}

export async function updateImmigrationFormAction(
  id: string,
  rawValues: ImmigrationFormFormValues,
) {
  const values = immigrationFormFormSchema.parse(rawValues);

  await getDb()
    .update(immigrationForms)
    .set(normalize(values))
    .where(eq(immigrationForms.id, id));

  await logAuditEvent({
    action: "immigration_form.updated",
    entityType: "immigration_form",
    entityId: id,
    summary: `Updated immigration form "${values.formNumber} — ${values.formName}"`,
  });

  revalidatePath("/immigration-forms");
}

export async function toggleImmigrationFormActiveAction(
  id: string,
  active: boolean,
) {
  await getDb()
    .update(immigrationForms)
    .set({ active, updatedAt: new Date() })
    .where(eq(immigrationForms.id, id));

  await logAuditEvent({
    action: "immigration_form.updated",
    entityType: "immigration_form",
    entityId: id,
    summary: `Immigration form ${active ? "activated" : "retired"}`,
  });

  revalidatePath("/immigration-forms");
}

export async function deleteImmigrationFormAction(id: string) {
  await getDb().delete(immigrationForms).where(eq(immigrationForms.id, id));

  await logAuditEvent({
    action: "immigration_form.deleted",
    entityType: "immigration_form",
    entityId: id,
    summary: "Deleted an immigration form",
  });

  revalidatePath("/immigration-forms");
}
