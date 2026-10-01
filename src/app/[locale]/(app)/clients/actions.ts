"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { clientFormSchema, type ClientFormValues } from "@/lib/validation/client";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { logAuditEvent } from "@/lib/audit";

function normalize(values: ClientFormValues) {
  const interestedServices = Array.from(new Set(values.interestedServices));
  return {
    fullName: values.fullName,
    email: values.email || null,
    phone: values.phone || null,
    preferredLanguage: values.preferredLanguage,
    status: values.status,
    referralSource: values.referralSource || null,
    interestedServices: interestedServices.length
      ? interestedServices
      : null,
    notes: values.notes || null,
    companyId: values.companyId || null,
    folderNumber: values.folderNumber || null,
  };
}

export async function createClientAction(rawValues: ClientFormValues) {
  const id = await insertClient(rawValues);
  const locale = await getLocale();
  redirect({ href: `/clients/${id}`, locale });
}

// Used by the New Client form when a document is staged alongside it: a
// document can't be attached before the client row exists, so this
// creates the client and hands back its id (no redirect) so the caller
// can upload the file, then navigate itself.
export async function createClientForUploadAction(rawValues: ClientFormValues) {
  return insertClient(rawValues);
}

async function insertClient(rawValues: ClientFormValues) {
  const values = clientFormSchema.parse(rawValues);
  const db = getDb();

  const [created] = await db
    .insert(clients)
    .values(normalize(values))
    .returning({ id: clients.id });

  revalidatePath("/clients");
  return created.id;
}

export async function updateClientAction(
  id: string,
  rawValues: ClientFormValues,
) {
  const values = clientFormSchema.parse(rawValues);
  const db = getDb();

  await db.update(clients).set(normalize(values)).where(eq(clients.id, id));

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  const locale = await getLocale();
  redirect({ href: `/clients/${id}`, locale });
}

// Admin-only hard delete, added on explicit request. Cascades the client's
// own cases, appointments, and documents (schema.ts onDelete rules) — that
// blast radius is spelled out in the UI's confirmation dialog, not just
// assumed. Invoices/payments use onDelete "restrict" on purpose (financial
// correctness), so a client with billing history can't be deleted until
// those are removed first; we surface that instead of letting the DB error
// bubble up raw. A notary journal entry is never touched beyond having its
// clientId set null — its frozen clientNameSnapshot keeps it intact.
export async function deleteClientAction(
  id: string,
): Promise<{ ok: true } | { ok: false; reason: "has_billing_history" }> {
  const db = getDb();
  const [existing] = await db
    .select({ fullName: clients.fullName })
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);
  if (!existing) return { ok: true };

  try {
    await db.delete(clients).where(eq(clients.id, id));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23503") {
      return { ok: false, reason: "has_billing_history" };
    }
    throw error;
  }

  await logAuditEvent({
    action: "client.deleted",
    entityType: "client",
    entityId: id,
    summary: `Deleted client: ${existing.fullName}`,
  });

  revalidatePath("/clients");
  const locale = await getLocale();
  redirect({ href: "/clients", locale });
  return { ok: true };
}
