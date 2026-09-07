"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appointments, clients, tasks, cases } from "@/lib/db/schema";
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
  const db = getDb();

  const [created] = await db
    .insert(appointments)
    .values(normalize(values, clientId, session?.user?.email ?? null))
    .returning({ id: appointments.id });

  // Section 8: "Creada -> ... crear tarea de confirmación si aplica" — only
  // when it isn't already past the "needs confirming" stage.
  if (values.status === "requested" || values.status === "scheduled") {
    await db.insert(tasks).values({
      clientId,
      caseId: values.caseId || null,
      appointmentId: created.id,
      type: "appointment_confirmation",
      title: `Confirm: ${values.title}`,
    });
  }

  revalidatePath("/appointments");
  revalidatePath("/tasks");
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
  const db = getDb();

  const [existing] = await db
    .select({ status: appointments.status })
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);

  await db
    .update(appointments)
    .set(normalize(values, clientId))
    .where(eq(appointments.id, id));

  await runAppointmentStatusWorkflow(id, existing?.status ?? null, values.status);

  revalidatePath("/appointments");
  revalidatePath(`/clients/${clientId}`);
  const locale = await getLocale();
  redirect({ href: "/appointments", locale });
}

// Section 8's "Completada" and "No Show" workflows: a follow-up task
// (retitled for no-shows), deduped per appointment via tasks.appointmentId
// so a second appointment on the same case still gets its own. "Cancelada
// -> preservar el registro, NO eliminar" needs no code — every update here
// only ever changes status, never deletes.
async function runAppointmentStatusWorkflow(
  appointmentId: string,
  previousStatus: Appointment["status"] | null,
  newStatus: Appointment["status"],
) {
  if (previousStatus === newStatus) return;
  if (newStatus !== "completed" && newStatus !== "no_show") return;

  const db = getDb();
  const [appt] = await db
    .select({
      title: appointments.title,
      clientId: appointments.clientId,
      caseId: appointments.caseId,
    })
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);
  if (!appt) return;

  const taskTitle =
    newStatus === "no_show"
      ? `No-show follow-up: ${appt.title}`
      : `Follow up: ${appt.title}`;

  const [existingTask] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.appointmentId, appointmentId),
        eq(tasks.type, "follow_up"),
        eq(tasks.status, "open"),
      ),
    )
    .limit(1);

  if (!existingTask) {
    await db.insert(tasks).values({
      clientId: appt.clientId,
      caseId: appt.caseId,
      appointmentId,
      type: "follow_up",
      title: taskTitle,
    });
  }

  // "actualizar estado del servicio relacionado si aplica" — refreshes
  // staleness only; the case's coarse status stays derived from its own
  // service-specific pipeline field (AGENTS.md), which an appointment has
  // no way to know the right value for.
  if (newStatus === "completed" && appt.caseId) {
    await db
      .update(cases)
      .set({ updatedAt: new Date() })
      .where(eq(cases.id, appt.caseId));
  }

  revalidatePath("/tasks");
}

// Section 6's "Mark Completed" / "Cancel" buttons — a plain status
// transition. Never deletes anything (section 8: "Cancelada → preservar
// el registro, NO eliminar" is already true of every update here).
export async function updateAppointmentStatusAction(
  id: string,
  status: Appointment["status"],
) {
  const db = getDb();
  const [existing] = await db
    .select({ status: appointments.status })
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);

  await db
    .update(appointments)
    .set({ status, updatedAt: new Date() })
    .where(eq(appointments.id, id));

  await runAppointmentStatusWorkflow(id, existing?.status ?? null, status);

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
// like any other task. Dedupes against Session 5's automatic
// completed/no-show workflow via appointmentId + type, so clicking this
// and later marking the appointment completed doesn't create two.
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

  const [existingTask] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.appointmentId, id),
        eq(tasks.type, "follow_up"),
        eq(tasks.status, "open"),
      ),
    )
    .limit(1);
  if (existingTask) return;

  const dueDate = new Date(appt.startAt);
  dueDate.setDate(dueDate.getDate() + 1);

  await db.insert(tasks).values({
    clientId: appt.clientId,
    caseId: appt.caseId,
    appointmentId: id,
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
