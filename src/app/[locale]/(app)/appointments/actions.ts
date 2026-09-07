"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appointments, clients, tasks } from "@/lib/db/schema";
import type { Appointment } from "@/lib/db/schema";
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

// Section 6's "Mark Completed" / "Cancel" buttons — a plain status
// transition. Never deletes anything (section 8: "Cancelada → preservar
// el registro, NO eliminar" is already true of every update here).
export async function updateAppointmentStatusAction(
  id: string,
  status: Appointment["status"],
) {
  await getDb()
    .update(appointments)
    .set({ status, updatedAt: new Date() })
    .where(eq(appointments.id, id));

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${id}`);
}

// Section 6's "Record Payment" button. Appointments carry their own
// paymentStatus (Session 1) independent of the Invoices/Payments module —
// this is a quick status flip, not a full invoice/payment record.
export async function updateAppointmentPaymentStatusAction(
  id: string,
  paymentStatus: NonNullable<Appointment["paymentStatus"]>,
) {
  await getDb()
    .update(appointments)
    .set({ paymentStatus, updatedAt: new Date() })
    .where(eq(appointments.id, id));

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${id}`);
}

// Section 6's "Add Note" button — appends a timestamped line rather than
// replacing the field, since staff may add several quick notes over time
// without wanting to lose what was there before.
export async function addAppointmentNoteAction(id: string, note: string) {
  const trimmed = note.trim();
  if (!trimmed) return;

  const db = getDb();
  const [existing] = await db
    .select({ notes: appointments.notes })
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);

  const timestamp = new Date().toLocaleString();
  const appended = existing?.notes
    ? `${existing.notes}\n\n[${timestamp}] ${trimmed}`
    : `[${timestamp}] ${trimmed}`;

  await db
    .update(appointments)
    .set({ notes: appended, updatedAt: new Date() })
    .where(eq(appointments.id, id));

  revalidatePath(`/appointments/${id}`);
}

// Section 6's "Create Follow-Up" button — a real row in the same tasks
// table every other module's automatic follow-ups already use, due the
// day after the appointment; staff can retitle/reschedule it from Tasks
// like any other task.
export async function createFollowUpTaskAction(id: string) {
  const db = getDb();
  const [appt] = await db
    .select({
      clientId: appointments.clientId,
      caseId: appointments.caseId,
      title: appointments.title,
      startAt: appointments.startAt,
    })
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);
  if (!appt) return;

  const dueDate = new Date(appt.startAt);
  dueDate.setDate(dueDate.getDate() + 1);

  await db.insert(tasks).values({
    clientId: appt.clientId,
    caseId: appt.caseId,
    type: "follow_up",
    title: `Follow up: ${appt.title}`,
    dueDate: dueDate.toISOString().slice(0, 10),
  });

  revalidatePath("/tasks");
  revalidatePath(`/appointments/${id}`);
}

// Section 6's "Reschedule" button, implementing section 8's rule exactly:
// "preservar historial original, crear nueva fecha, marcar original como
// Reprogramada" — never overwrites the original row. Uses Session 1's
// rescheduledFromId self-reference to link the new appointment back.
export async function rescheduleAppointmentAction(
  id: string,
  values: { startAt: string; endAt: string },
) {
  const db = getDb();
  const [original] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);
  if (!original) return;

  const [created] = await db
    .insert(appointments)
    .values({
      clientId: original.clientId,
      caseId: original.caseId,
      title: original.title,
      serviceType: original.serviceType,
      appointmentType: original.appointmentType,
      startAt: new Date(values.startAt),
      endAt: new Date(values.endAt),
      location: original.location,
      status: "scheduled",
      referralSource: original.referralSource,
      documentsNeeded: original.documentsNeeded,
      paymentRequired: original.paymentRequired,
      paymentStatus: original.paymentStatus,
      notes: original.notes,
      createdByEmail: original.createdByEmail,
      rescheduledFromId: original.id,
    })
    .returning({ id: appointments.id });

  await db
    .update(appointments)
    .set({ status: "rescheduled", updatedAt: new Date() })
    .where(eq(appointments.id, id));

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${id}`);
  const locale = await getLocale();
  redirect({ href: `/appointments/${created.id}`, locale });
}
