import { and, desc, eq, gte, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clients,
  cases,
  appointments,
  conversationMessages,
  clientCommunicationPreferences,
  clientHighlevelSync,
} from "@/lib/db/schema";

export async function getClientHighlevelSync(clientId: string) {
  const [row] = await getDb()
    .select()
    .from(clientHighlevelSync)
    .where(eq(clientHighlevelSync.clientId, clientId))
    .limit(1);

  return row ?? null;
}

// Phase 4, Session 5 — the read-only "what would actually leave the
// building" preview for the safe-fields list in the Phase 4 plan. Every
// value is read live from its one real source (never duplicated into a
// sync-payload table), so this can never drift from the record it
// describes. SSN/ITIN/bank/card/tax-return/immigration-document fields are
// deliberately absent — there is no code path here that could include them.
export async function getHighLevelSyncPreview(clientId: string) {
  const db = getDb();

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client) return null;

  const [
    [lastBusinessNameRow],
    [nextAppointment],
    academyCase,
    preferences,
  ] = await Promise.all([
    db
      .select({ businessName: conversationMessages.businessName })
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.clientId, clientId),
          isNotNull(conversationMessages.businessName),
        ),
      )
      .orderBy(desc(conversationMessages.occurredAt))
      .limit(1),
    db
      .select({ startAt: appointments.startAt })
      .from(appointments)
      .where(
        and(
          eq(appointments.clientId, clientId),
          gte(appointments.startAt, new Date()),
        ),
      )
      .orderBy(appointments.startAt)
      .limit(1),
    db
      .select({ id: cases.id })
      .from(cases)
      .where(and(eq(cases.clientId, clientId), eq(cases.serviceType, "academy")))
      .limit(1),
    db
      .select()
      .from(clientCommunicationPreferences)
      .where(eq(clientCommunicationPreferences.clientId, clientId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  return {
    clientName: client.fullName,
    businessName: lastBusinessNameRow?.businessName ?? null,
    phone: client.phone,
    email: client.email,
    language: client.preferredLanguage,
    serviceInterest: client.interestedServices ?? [],
    leadSource: client.referralSource,
    referralSource: client.referralSource,
    assignedUser: null as string | null,
    appointmentDate: nextAppointment?.startAt ?? null,
    clientStatus: client.status,
    academyInterest:
      Boolean(academyCase) ||
      (client.interestedServices ?? []).includes("academy"),
    communicationConsent: {
      email: preferences?.emailConsent ?? false,
      sms: preferences?.smsConsent ?? false,
      whatsapp: preferences?.whatsappConsent ?? false,
      marketing: preferences?.marketingConsent ?? false,
    },
  };
}
