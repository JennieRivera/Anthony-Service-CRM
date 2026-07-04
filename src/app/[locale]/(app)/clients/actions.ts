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
  };
}

export async function createClientAction(rawValues: ClientFormValues) {
  const values = clientFormSchema.parse(rawValues);
  const db = getDb();

  const [created] = await db
    .insert(clients)
    .values(normalize(values))
    .returning({ id: clients.id });

  revalidatePath("/clients");
  const locale = await getLocale();
  redirect({ href: `/clients/${created.id}`, locale });
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
