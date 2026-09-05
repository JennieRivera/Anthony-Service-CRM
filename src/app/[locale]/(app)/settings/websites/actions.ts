"use server";

import { revalidatePath } from "next/cache";
import { eq, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { websiteLinks } from "@/lib/db/schema";
import {
  websiteLinkFormSchema,
  type WebsiteLinkFormValues,
} from "@/lib/validation/websiteLink";
import { logAuditEvent } from "@/lib/audit";

function normalize(values: WebsiteLinkFormValues) {
  return {
    name: values.name,
    url: values.url,
    status: values.status,
    notes: values.notes || null,
    active: values.active ?? true,
    lastCheckedAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function createWebsiteLinkAction(rawValues: WebsiteLinkFormValues) {
  const values = websiteLinkFormSchema.parse(rawValues);
  const db = getDb();

  const rows = await db
    .select({ sortOrder: websiteLinks.sortOrder })
    .from(websiteLinks)
    .orderBy(asc(websiteLinks.sortOrder));
  const nextSort = rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 0;

  const [created] = await db
    .insert(websiteLinks)
    .values({ ...normalize(values), sortOrder: nextSort })
    .returning({ id: websiteLinks.id });

  await logAuditEvent({
    action: "website_link.created",
    entityType: "website_link",
    entityId: created.id,
    summary: `Added website "${values.name}"`,
  });

  revalidatePath("/settings/websites");
  revalidatePath("/");
}

export async function updateWebsiteLinkAction(
  id: string,
  rawValues: WebsiteLinkFormValues,
) {
  const values = websiteLinkFormSchema.parse(rawValues);

  await getDb()
    .update(websiteLinks)
    .set(normalize(values))
    .where(eq(websiteLinks.id, id));

  await logAuditEvent({
    action: "website_link.updated",
    entityType: "website_link",
    entityId: id,
    summary: `Updated website "${values.name}" (status: ${values.status})`,
  });

  revalidatePath("/settings/websites");
  revalidatePath("/");
}

export async function toggleWebsiteLinkActiveAction(id: string, active: boolean) {
  await getDb()
    .update(websiteLinks)
    .set({ active, updatedAt: new Date() })
    .where(eq(websiteLinks.id, id));

  await logAuditEvent({
    action: "website_link.updated",
    entityType: "website_link",
    entityId: id,
    summary: `Website ${active ? "enabled" : "disabled"}`,
  });

  revalidatePath("/settings/websites");
  revalidatePath("/");
}

export async function reorderWebsiteLinkAction(id: string, direction: "up" | "down") {
  const db = getDb();
  const rows = await db
    .select({ id: websiteLinks.id, sortOrder: websiteLinks.sortOrder })
    .from(websiteLinks)
    .orderBy(asc(websiteLinks.sortOrder));

  const index = rows.findIndex((r) => r.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= rows.length) return;

  const current = rows[index];
  const swapWith = rows[swapIndex];

  await Promise.all([
    db
      .update(websiteLinks)
      .set({ sortOrder: swapWith.sortOrder })
      .where(eq(websiteLinks.id, current.id)),
    db
      .update(websiteLinks)
      .set({ sortOrder: current.sortOrder })
      .where(eq(websiteLinks.id, swapWith.id)),
  ]);

  revalidatePath("/settings/websites");
  revalidatePath("/");
}
