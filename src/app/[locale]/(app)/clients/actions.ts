"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { clientFormSchema, type ClientFormValues } from "@/lib/validation/client";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

function normalize(values: ClientFormValues) {
  return {
    fullName: values.fullName,
    email: values.email || null,
    phone: values.phone || null,
    preferredLanguage: values.preferredLanguage,
    status: values.status,
    referralSource: values.referralSource || null,
    interestedServices: values.interestedServices.length
      ? values.interestedServices
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
