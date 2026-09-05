"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { irsResources } from "@/lib/db/schema";
import {
  irsResourceFormSchema,
  type IrsResourceFormValues,
} from "@/lib/validation/irsResource";
import { logAuditEvent } from "@/lib/audit";

function normalize(values: IrsResourceFormValues) {
  return {
    name: values.name,
    category: values.category,
    url: values.url,
    description: values.description || null,
    lastVerifiedDate: values.lastVerifiedDate || null,
    verifiedBy: values.verifiedBy || null,
    active: values.active ?? true,
    updatedAt: new Date(),
  };
}

export async function createIrsResourceAction(rawValues: IrsResourceFormValues) {
  const values = irsResourceFormSchema.parse(rawValues);
  const [created] = await getDb()
    .insert(irsResources)
    .values(normalize(values))
    .returning({ id: irsResources.id });

  await logAuditEvent({
    action: "irs_resource.created",
    entityType: "irs_resource",
    entityId: created.id,
    summary: `Added IRS resource "${values.name}"`,
  });

  revalidatePath("/irs-resources");
}

export async function updateIrsResourceAction(
  id: string,
  rawValues: IrsResourceFormValues,
) {
  const values = irsResourceFormSchema.parse(rawValues);

  await getDb()
    .update(irsResources)
    .set(normalize(values))
    .where(eq(irsResources.id, id));

  await logAuditEvent({
    action: "irs_resource.updated",
    entityType: "irs_resource",
    entityId: id,
    summary: `Updated IRS resource "${values.name}"`,
  });

  revalidatePath("/irs-resources");
}

export async function toggleIrsResourceActiveAction(id: string, active: boolean) {
  await getDb()
    .update(irsResources)
    .set({ active, updatedAt: new Date() })
    .where(eq(irsResources.id, id));

  await logAuditEvent({
    action: "irs_resource.updated",
    entityType: "irs_resource",
    entityId: id,
    summary: `IRS resource ${active ? "enabled" : "disabled"}`,
  });

  revalidatePath("/irs-resources");
}

export async function deleteIrsResourceAction(id: string) {
  await getDb().delete(irsResources).where(eq(irsResources.id, id));

  await logAuditEvent({
    action: "irs_resource.deleted",
    entityType: "irs_resource",
    entityId: id,
    summary: "Deleted an IRS resource",
  });

  revalidatePath("/irs-resources");
}
