"use server";

import { revalidatePath } from "next/cache";
import { eq, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { serviceCatalogItems } from "@/lib/db/schema";
import {
  serviceCatalogItemFormSchema,
  type ServiceCatalogItemFormValues,
} from "@/lib/validation/serviceCatalog";
import { logAuditEvent } from "@/lib/audit";

function normalize(values: ServiceCatalogItemFormValues) {
  return {
    name: values.name,
    serviceType: values.serviceType,
    price: values.price,
    active: values.active,
    notes: values.notes || null,
    updatedAt: new Date(),
  };
}

export async function createServiceCatalogItemAction(
  rawValues: ServiceCatalogItemFormValues,
) {
  const values = serviceCatalogItemFormSchema.parse(rawValues);
  const db = getDb();

  const rows = await db
    .select({ sortOrder: serviceCatalogItems.sortOrder })
    .from(serviceCatalogItems)
    .orderBy(asc(serviceCatalogItems.sortOrder));
  const nextSort = rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 0;

  const [created] = await db
    .insert(serviceCatalogItems)
    .values({ ...normalize(values), sortOrder: nextSort })
    .returning({ id: serviceCatalogItems.id });

  await logAuditEvent({
    action: "service_catalog_item.created",
    entityType: "service_catalog_item",
    entityId: created.id,
    summary: `Added service "${values.name}" ($${values.price})`,
  });

  revalidatePath("/settings/service-catalog");
  revalidatePath("/cases/new");
}

export async function updateServiceCatalogItemAction(
  id: string,
  rawValues: ServiceCatalogItemFormValues,
) {
  const values = serviceCatalogItemFormSchema.parse(rawValues);

  await getDb()
    .update(serviceCatalogItems)
    .set(normalize(values))
    .where(eq(serviceCatalogItems.id, id));

  await logAuditEvent({
    action: "service_catalog_item.updated",
    entityType: "service_catalog_item",
    entityId: id,
    summary: `Updated service "${values.name}" ($${values.price})`,
  });

  revalidatePath("/settings/service-catalog");
  revalidatePath("/cases/new");
}

export async function toggleServiceCatalogItemActiveAction(
  id: string,
  active: boolean,
) {
  await getDb()
    .update(serviceCatalogItems)
    .set({ active, updatedAt: new Date() })
    .where(eq(serviceCatalogItems.id, id));

  await logAuditEvent({
    action: "service_catalog_item.updated",
    entityType: "service_catalog_item",
    entityId: id,
    summary: `Service catalog item ${active ? "enabled" : "disabled"}`,
  });

  revalidatePath("/settings/service-catalog");
  revalidatePath("/cases/new");
}
