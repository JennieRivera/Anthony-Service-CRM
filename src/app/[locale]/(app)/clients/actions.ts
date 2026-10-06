"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { clientFormSchema, type ClientFormValues } from "@/lib/validation/client";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { logAuditEvent } from "@/lib/audit";
import { findPossibleDuplicateClients } from "@/lib/queries/clients";
import { requireAuthenticatedUser } from "@/lib/permissions";
import { del } from "@vercel/blob";
import { isBlobConfigured } from "@/lib/blob/config";
import { deleteClientRecord } from "@/lib/deletion";

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
    ...(values.address !== undefined ? { address: values.address || null } : {}),
    ...(values.bestTimeToCall !== undefined ? { bestTimeToCall: values.bestTimeToCall || null } : {}),
  };
}

export async function createClientAction(rawValues: ClientFormValues) {
  await requireAuthenticatedUser();
  const id = await insertClient(rawValues);
  const locale = await getLocale();
  redirect({ href: `/clients/${id}`, locale });
}

// Phase 2A — Academy New Student flow. Same creation path as
// createClientAction, but lands back in Academy enrollment instead of the
// plain client profile, so "search existing person, else create one" never
// strands staff on a page with no obvious next step.
export async function createClientAndContinueToEnrollmentAction(
  rawValues: ClientFormValues,
) {
  await requireAuthenticatedUser();
  const id = await insertClient(rawValues);
  const locale = await getLocale();
  redirect({ href: `/cases/new?serviceType=academy&clientId=${id}`, locale });
}

// Phase 2A — Master Person Identity Safety Net. Soft, informational only:
// never merges, deletes, or blocks — see findPossibleDuplicateClients for
// the matching rules. Reused by the New Client form, the Academy New
// Student search, and Diamond Community's non-student member entry.
export async function findPossibleDuplicateClientsAction(query: {
  fullName?: string;
  email?: string;
  phone?: string;
}) {
  await requireAuthenticatedUser();
  return findPossibleDuplicateClients(query);
}

// Used by the New Client form when a document is staged alongside it: a
// document can't be attached before the client row exists, so this
// creates the client and hands back its id (no redirect) so the caller
// can upload the file, then navigate itself.
export async function createClientForUploadAction(rawValues: ClientFormValues) {
  await requireAuthenticatedUser();
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
  await requireAuthenticatedUser();
  const values = clientFormSchema.parse(rawValues);
  const db = getDb();

  await db.update(clients).set(normalize(values)).where(eq(clients.id, id));

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  const locale = await getLocale();
  redirect({ href: `/clients/${id}`, locale });
}

// Admin-only hard delete, added on explicit request. Cascades the client's
// own cases, appointments, documents and tasks (schema.ts onDelete rules);
// the client's referrals are deleted first, since a referral can't exist
// without its client (that RESTRICT is what used to crash this). The blast
// radius is spelled out in the confirmation dialog (getClientDeletionImpact).
// Financial history blocks it with a reason instead: invoices/payments, or a
// referral that has a compensation record. A notary journal entry is never
// touched beyond having its clientId set null — its frozen
// clientNameSnapshot keeps it intact.
export async function deleteClientAction(
  id: string,
): Promise<{ ok: true } | { ok: false; reason: "billing" | "compensation" | "linked_records" }> {
  await requireAuthenticatedUser();
  const result = await deleteClientRecord(getDb(), id);
  if (!result.ok) {
    if (result.reason === "not_found") return { ok: true };
    return { ok: false, reason: result.reason };
  }

  // The files of the deleted documents (best effort, like a single
  // document delete).
  if (isBlobConfigured()) {
    await Promise.all(result.documentUrls.map((url) => del(url).catch(() => undefined)));
  }

  await logAuditEvent({
    action: "client.deleted",
    entityType: "client",
    entityId: id,
    summary:
      result.referrals > 0
        ? `Deleted client: ${result.fullName} (and ${result.referrals} referral(s))`
        : `Deleted client: ${result.fullName}`,
  });

  revalidatePath("/clients");
  revalidatePath("/tasks");
  revalidatePath("/referrals");
  const locale = await getLocale();
  redirect({ href: "/clients", locale });
  return { ok: true };
}
