import { and, desc, eq, gte, lt } from "drizzle-orm";
import { businessLocalToUtc } from "@/lib/dates";
import { getDb } from "@/lib/db";
import {
  conversationMessages,
  clients,
  cases,
  referrals,
  tasks,
  appointments,
  strategicAlliances,
  associationsChambers,
} from "@/lib/db/schema";

export type CommunicationListFilters = {
  channel?: string;
  status?: string;
  direction?: string;
  clientId?: string;
  // YYYY-MM-DD, Florida business dates, both inclusive.
  from?: string;
  to?: string;
  followUp?: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function nextDay(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

export async function listCommunicationsWithClient(
  filters: CommunicationListFilters = {},
) {
  const conditions = [
    filters.channel
      ? eq(
          conversationMessages.channel,
          filters.channel as (typeof conversationMessages.channel.enumValues)[number],
        )
      : undefined,
    filters.status
      ? eq(
          conversationMessages.status,
          filters.status as (typeof conversationMessages.status.enumValues)[number],
        )
      : undefined,
    filters.direction
      ? eq(
          conversationMessages.direction,
          filters.direction as (typeof conversationMessages.direction.enumValues)[number],
        )
      : undefined,
    filters.clientId && /^[0-9a-f-]{36}$/i.test(filters.clientId)
      ? eq(conversationMessages.clientId, filters.clientId)
      : undefined,
    filters.from && DAY.test(filters.from)
      ? gte(conversationMessages.occurredAt, businessLocalToUtc(filters.from))
      : undefined,
    filters.to && DAY.test(filters.to)
      ? lt(conversationMessages.occurredAt, businessLocalToUtc(nextDay(filters.to)))
      : undefined,
    filters.followUp === "1" ? eq(conversationMessages.followUpRequired, true) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c !== undefined);

  return getDb()
    .select({
      id: conversationMessages.id,
      communicationSeq: conversationMessages.communicationSeq,
      occurredAt: conversationMessages.occurredAt,
      channel: conversationMessages.channel,
      direction: conversationMessages.direction,
      subject: conversationMessages.subject,
      summary: conversationMessages.summary,
      status: conversationMessages.status,
      followUpRequired: conversationMessages.followUpRequired,
      followUpDate: conversationMessages.followUpDate,
      durationMinutes: conversationMessages.durationMinutes,
      callOutcome: conversationMessages.callOutcome,
      googleKind: conversationMessages.googleKind,
      reviewStars: conversationMessages.reviewStars,
      createdByEmail: conversationMessages.createdByEmail,
      clientId: clients.id,
      clientName: clients.fullName,
      caseTitle: cases.title,
    })
    .from(conversationMessages)
    .innerJoin(clients, eq(conversationMessages.clientId, clients.id))
    .leftJoin(cases, eq(conversationMessages.caseId, cases.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(conversationMessages.occurredAt));
}

export async function getCommunicationById(id: string) {
  const db = getDb();

  const [row] = await db
    .select({
      communication: conversationMessages,
      client: clients,
      caseTitle: cases.title,
      referralSeq: referrals.referralSeq,
      taskTitle: tasks.title,
      taskStatus: tasks.status,
      appointmentTitle: appointments.title,
      allianceName: strategicAlliances.organizationName,
      associationName: associationsChambers.organizationName,
    })
    .from(conversationMessages)
    .innerJoin(clients, eq(conversationMessages.clientId, clients.id))
    .leftJoin(cases, eq(conversationMessages.caseId, cases.id))
    .leftJoin(referrals, eq(conversationMessages.referralId, referrals.id))
    .leftJoin(tasks, eq(conversationMessages.taskId, tasks.id))
    .leftJoin(appointments, eq(conversationMessages.appointmentId, appointments.id))
    .leftJoin(
      strategicAlliances,
      eq(conversationMessages.allianceId, strategicAlliances.id),
    )
    .leftJoin(
      associationsChambers,
      eq(conversationMessages.associationId, associationsChambers.id),
    )
    .where(eq(conversationMessages.id, id))
    .limit(1);

  return row ?? null;
}
