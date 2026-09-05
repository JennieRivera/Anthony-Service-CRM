"use server";

import { revalidatePath } from "next/cache";
import { eq, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { professionalSystems } from "@/lib/db/schema";
import {
  professionalSystemFormSchema,
  type ProfessionalSystemFormValues,
} from "@/lib/validation/professionalSystem";
import { logAuditEvent } from "@/lib/audit";

function normalize(values: ProfessionalSystemFormValues) {
  return {
    name: values.name,
    category: values.category,
    url: values.url || null,
    icon: values.icon || null,
    description: values.description || null,
    connectionStatus: values.connectionStatus,
    integrationType: values.integrationType,
    notes: values.notes || null,
    active: values.active ?? true,
    openInNewTab: values.openInNewTab ?? true,
    updatedAt: new Date(),
  };
}

export async function createProfessionalSystemAction(
  rawValues: ProfessionalSystemFormValues,
) {
  const values = professionalSystemFormSchema.parse(rawValues);
  const db = getDb();

  const rows = await db
    .select({ sortOrder: professionalSystems.sortOrder })
    .from(professionalSystems)
    .orderBy(asc(professionalSystems.sortOrder));
  const nextSort = rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 0;

  const [created] = await db
    .insert(professionalSystems)
    .values({ ...normalize(values), sortOrder: nextSort })
    .returning({ id: professionalSystems.id });

  await logAuditEvent({
    action: "professional_system.created",
    entityType: "professional_system",
    entityId: created.id,
    summary: `Added professional system "${values.name}"`,
  });

  revalidatePath("/settings/professional-systems");
  revalidatePath("/");
}

export async function updateProfessionalSystemAction(
  id: string,
  rawValues: ProfessionalSystemFormValues,
) {
  const values = professionalSystemFormSchema.parse(rawValues);

  await getDb()
    .update(professionalSystems)
    .set(normalize(values))
    .where(eq(professionalSystems.id, id));

  await logAuditEvent({
    action: "professional_system.updated",
    entityType: "professional_system",
    entityId: id,
    summary: `Updated professional system "${values.name}" (active: ${values.active ?? true})`,
  });

  revalidatePath("/settings/professional-systems");
  revalidatePath("/");
}

export async function toggleProfessionalSystemActiveAction(
  id: string,
  active: boolean,
) {
  await getDb()
    .update(professionalSystems)
    .set({ active, updatedAt: new Date() })
    .where(eq(professionalSystems.id, id));

  await logAuditEvent({
    action: "professional_system.updated",
    entityType: "professional_system",
    entityId: id,
    summary: `Professional system ${active ? "enabled" : "disabled"}`,
  });

  revalidatePath("/settings/professional-systems");
  revalidatePath("/");
}

export async function reorderProfessionalSystemAction(
  id: string,
  direction: "up" | "down",
) {
  const db = getDb();
  const rows = await db
    .select({ id: professionalSystems.id, sortOrder: professionalSystems.sortOrder })
    .from(professionalSystems)
    .orderBy(asc(professionalSystems.sortOrder));

  const index = rows.findIndex((r) => r.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= rows.length) return;

  const current = rows[index];
  const swapWith = rows[swapIndex];

  await Promise.all([
    db
      .update(professionalSystems)
      .set({ sortOrder: swapWith.sortOrder })
      .where(eq(professionalSystems.id, current.id)),
    db
      .update(professionalSystems)
      .set({ sortOrder: current.sortOrder })
      .where(eq(professionalSystems.id, swapWith.id)),
  ]);

  revalidatePath("/settings/professional-systems");
  revalidatePath("/");
}
