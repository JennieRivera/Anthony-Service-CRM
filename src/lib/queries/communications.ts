import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { conversationMessages, clients, cases, referrals, tasks } from "@/lib/db/schema";

export type CommunicationListFilters = {
  channel?: string;
  status?: string;
  direction?: string;
};

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
    })
    .from(conversationMessages)
    .innerJoin(clients, eq(conversationMessages.clientId, clients.id))
    .leftJoin(cases, eq(conversationMessages.caseId, cases.id))
    .leftJoin(referrals, eq(conversationMessages.referralId, referrals.id))
    .leftJoin(tasks, eq(conversationMessages.taskId, tasks.id))
    .where(eq(conversationMessages.id, id))
    .limit(1);

  return row ?? null;
}
