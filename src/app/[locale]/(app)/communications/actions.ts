"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  conversationMessages,
  tasks,
  clientCommunicationPreferences,
} from "@/lib/db/schema";
import {
  communicationFormSchema,
  type CommunicationFormValues,
} from "@/lib/validation/communication";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";

function normalize(values: CommunicationFormValues) {
  return {
    clientId: values.clientId,
    caseId: values.caseId || null,
    referralId: values.referralId || null,
    businessName: values.businessName || null,
    channel: values.channel,
    direction: values.direction,
    occurredAt: new Date(values.occurredAt),
    subject: values.subject || null,
    summary: values.summary,
    fullMessage: values.fullMessage || null,
    durationMinutes: values.durationMinutes
      ? Number(values.durationMinutes)
      : null,
    counterpart: values.counterpart || null,
    status: values.status,
    followUpRequired: values.followUpRequired ?? false,
    followUpDate: values.followUpDate || null,
    updatedAt: new Date(),
  };
}

// Phase 4, Session 6 — "When client opts out ... prevent automated outbound
// communication through that channel" (spec #10). Enforced here for the
// three channels with a per-client consent record (WhatsApp/Email/SMS);
// Facebook/Instagram opt-out lives on the thread itself (Session 4), not a
// client-wide record, so isn't checked here. Inbound messages are never
// blocked — a client can always reply on a channel they've opted out of
// outbound messages on.
async function assertOutboundChannelAllowed(
  clientId: string,
  channel: CommunicationFormValues["channel"],
  direction: CommunicationFormValues["direction"],
) {
  if (direction !== "outbound") return;

  const [prefs] = await getDb()
    .select({
      whatsappContactStatus: clientCommunicationPreferences.whatsappContactStatus,
      emailStatus: clientCommunicationPreferences.emailStatus,
      smsStatus: clientCommunicationPreferences.smsStatus,
    })
    .from(clientCommunicationPreferences)
    .where(eq(clientCommunicationPreferences.clientId, clientId))
    .limit(1);

  if (!prefs) return;

  if (channel === "whatsapp" && prefs.whatsappContactStatus === "opted_out") {
    throw new Error(
      "This client has opted out of WhatsApp. Outbound messages on this channel are blocked.",
    );
  }
  if (channel === "email" && prefs.emailStatus === "unsubscribed") {
    throw new Error(
      "This client has unsubscribed from email. Outbound messages on this channel are blocked.",
    );
  }
  if (channel === "sms" && prefs.smsStatus === "opted_out") {
    throw new Error(
      "This client has opted out of SMS. Outbound messages on this channel are blocked.",
    );
  }
}

// Session 1's slice of "Automated Communication Tasks" (Phase 4 spec #10):
// a follow-up communication gets an open task so it shows up on the
// dashboard/Tasks list. The broader automation rules (inactivity alerts
// across every channel, opt-out enforcement) land in a later session.
async function ensureFollowUpTask(
  communicationId: string,
  existingTaskId: string | null,
  values: ReturnType<typeof normalize>,
) {
  if (!values.followUpRequired || existingTaskId) return;

  const db = getDb();
  const [task] = await db
    .insert(tasks)
    .values({
      clientId: values.clientId,
      caseId: values.caseId,
      type: "follow_up",
      title: `Follow up: ${values.subject || values.summary.slice(0, 60)}`,
      dueDate: values.followUpDate,
    })
    .returning({ id: tasks.id });

  await db
    .update(conversationMessages)
    .set({ taskId: task.id })
    .where(eq(conversationMessages.id, communicationId));
}

export async function createCommunicationAction(
  rawValues: CommunicationFormValues,
) {
  const values = communicationFormSchema.parse(rawValues);
  await assertOutboundChannelAllowed(values.clientId, values.channel, values.direction);
  const db = getDb();
  const session = await auth();
  const normalized = normalize(values);

  const [created] = await db
    .insert(conversationMessages)
    .values({
      ...normalized,
      createdByEmail: session?.user?.email ?? null,
    })
    .returning({ id: conversationMessages.id });

  await ensureFollowUpTask(created.id, null, normalized);

  revalidatePath("/communications");
  revalidatePath(`/clients/${values.clientId}`);
  const locale = await getLocale();
  redirect({ href: `/communications/${created.id}`, locale });
}

export async function updateCommunicationAction(
  id: string,
  rawValues: CommunicationFormValues,
) {
  const values = communicationFormSchema.parse(rawValues);
  await assertOutboundChannelAllowed(values.clientId, values.channel, values.direction);
  const db = getDb();
  const normalized = normalize(values);

  const [existing] = await db
    .select({ taskId: conversationMessages.taskId })
    .from(conversationMessages)
    .where(eq(conversationMessages.id, id))
    .limit(1);

  await db
    .update(conversationMessages)
    .set(normalized)
    .where(eq(conversationMessages.id, id));

  await ensureFollowUpTask(id, existing?.taskId ?? null, normalized);

  revalidatePath("/communications");
  revalidatePath(`/communications/${id}`);
  revalidatePath(`/clients/${values.clientId}`);
  const locale = await getLocale();
  redirect({ href: `/communications/${id}`, locale });
}
