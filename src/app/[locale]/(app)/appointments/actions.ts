"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import {
  appointmentFormSchema,
  type AppointmentFormValues,
} from "@/lib/validation/appointment";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

function normalize(values: AppointmentFormValues) {
  return {
    clientId: values.clientId,
    caseId: values.caseId || null,
    title: values.title,
    serviceType: values.serviceType,
    startAt: new Date(values.startAt),
    endAt: new Date(values.endAt),
    location: values.location || null,
    status: values.status,
    notes: values.notes || null,
  };
}

export async function createAppointmentAction(
  rawValues: AppointmentFormValues,
) {
  const values = appointmentFormSchema.parse(rawValues);
  await getDb().insert(appointments).values(normalize(values));

  revalidatePath("/appointments");
  revalidatePath(`/clients/${values.clientId}`);
  const locale = await getLocale();
  redirect({ href: "/appointments", locale });
}

export async function updateAppointmentAction(
  id: string,
  rawValues: AppointmentFormValues,
) {
  const values = appointmentFormSchema.parse(rawValues);
  await getDb()
    .update(appointments)
    .set(normalize(values))
    .where(eq(appointments.id, id));

  revalidatePath("/appointments");
  revalidatePath(`/clients/${values.clientId}`);
  const locale = await getLocale();
  redirect({ href: "/appointments", locale });
}
