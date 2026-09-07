"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appointments, clients } from "@/lib/db/schema";
import {
  appointmentFormSchema,
  type AppointmentFormValues,
} from "@/lib/validation/appointment";
import { searchClientsForMatch } from "@/lib/queries/clients";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";

export async function searchClientMatchesAction(query: {
  phone?: string;
  email?: string;
  businessName?: string;
}) {
  return searchClientsForMatch(query);
}

// CALENDAR-PLAN.md section 3 — "search before creating, never duplicate".
// The client-side picker already searches and lets staff pick a match, but
// this re-checks server-side before ever inserting a new client: closes
// the race where staff searched, saw nothing, and someone else created the
// same client in the meantime, and is the one place this rule is actually
// enforced no matter which UI path got here.
async function resolveClientId(values: AppointmentFormValues): Promise<string> {
  if (values.clientId) return values.clientId;

  const matches = await searchClientsForMatch({
    phone: values.newClientPhone,
    email: values.newClientEmail,
    businessName: values.newClientBusinessName,
  });
  if (matches.length > 0) return matches[0].id;

  // clients has no free-text business-name column (only an optional link
  // to the Company Master Registry, and creating a full company record
  // needs more information than a booking flow has) — so an unmatched
  // business name is preserved in notes rather than silently dropped.
  const notes = values.newClientBusinessName
    ? `Business name provided at booking: ${values.newClientBusinessName}`
    : null;

  const [created] = await getDb()
    .insert(clients)
    .values({
      fullName: values.newClientFullName!.trim(),
      phone: values.newClientPhone || null,
      email: values.newClientEmail || null,
      status: "lead",
      notes,
    })
    .returning({ id: clients.id });

  return created.id;
}

function normalize(
  values: AppointmentFormValues,
  clientId: string,
  createdByEmail?: string | null,
) {
  return {
    clientId,
    caseId: values.caseId || null,
    title: values.title,
    serviceType: values.serviceType,
    appointmentType: values.appointmentType,
    startAt: new Date(values.startAt),
    endAt: new Date(values.endAt),
    location: values.location || null,
    status: values.status,
    referralSource: values.referralSource || null,
    documentsNeeded: values.documentsNeeded || null,
    paymentRequired: values.paymentRequired ?? false,
    paymentStatus: values.paymentStatus || null,
    notes: values.notes || null,
    updatedAt: new Date(),
    ...(createdByEmail !== undefined ? { createdByEmail } : {}),
  };
}

export async function createAppointmentAction(
  rawValues: AppointmentFormValues,
) {
  const values = appointmentFormSchema.parse(rawValues);
  const clientId = await resolveClientId(values);
  const session = await auth();

  await getDb()
    .insert(appointments)
    .values(normalize(values, clientId, session?.user?.email ?? null));

  revalidatePath("/appointments");
  revalidatePath(`/clients/${clientId}`);
  const locale = await getLocale();
  redirect({ href: "/appointments", locale });
}

export async function updateAppointmentAction(
  id: string,
  rawValues: AppointmentFormValues,
) {
  const values = appointmentFormSchema.parse(rawValues);
  const clientId = await resolveClientId(values);

  await getDb()
    .update(appointments)
    .set(normalize(values, clientId))
    .where(eq(appointments.id, id));

  revalidatePath("/appointments");
  revalidatePath(`/clients/${clientId}`);
  const locale = await getLocale();
  redirect({ href: "/appointments", locale });
}
