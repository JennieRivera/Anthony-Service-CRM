"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clientCommunicationPreferences } from "@/lib/db/schema";
import {
  communicationPreferencesFormSchema,
  type CommunicationPreferencesFormValues,
} from "@/lib/validation/communicationPreferences";
import { logAuditEvent } from "@/lib/audit";

export async function upsertCommunicationPreferencesAction(
  clientId: string,
  rawValues: CommunicationPreferencesFormValues,
) {
  const values = communicationPreferencesFormSchema.parse(rawValues);

  const [existing] = await getDb()
    .select()
    .from(clientCommunicationPreferences)
    .where(eq(clientCommunicationPreferences.clientId, clientId))
    .limit(1);

  const detail = {
    preferredChannel: values.preferredChannel || null,
    emailConsent: values.emailConsent ?? false,
    smsConsent: values.smsConsent ?? false,
    whatsappConsent: values.whatsappConsent ?? false,
    marketingConsent: values.marketingConsent ?? false,
    partnerReferralConsent: values.partnerReferralConsent ?? false,
    consentDate: values.consentDate || null,
    consentSource: values.consentSource || null,
    optOutDate: values.optOutDate || null,
    whatsappNumber: values.whatsappNumber || null,
    whatsappContactStatus: values.whatsappContactStatus,
    nextWhatsappFollowUpDate: values.nextWhatsappFollowUpDate || null,
    whatsappTemplateUsed: values.whatsappTemplateUsed || null,
    emailStatus: values.emailStatus,
    nextEmailFollowUpDate: values.nextEmailFollowUpDate || null,
    emailTemplateUsed: values.emailTemplateUsed || null,
    smsStatus: values.smsStatus,
    nextSmsFollowUpDate: values.nextSmsFollowUpDate || null,
    smsTemplateUsed: values.smsTemplateUsed || null,
    updatedAt: new Date(),
  };

  await getDb()
    .insert(clientCommunicationPreferences)
    .values({ clientId, ...detail })
    .onConflictDoUpdate({
      target: clientCommunicationPreferences.clientId,
      set: detail,
    });

  // Phase 4, Session 7 — logged as two distinct audit categories per spec
  // #13 ("Consent changes" / "Channel status changes"), only when that
  // group of fields actually changed value.
  const consentChanged =
    !existing ||
    existing.emailConsent !== detail.emailConsent ||
    existing.smsConsent !== detail.smsConsent ||
    existing.whatsappConsent !== detail.whatsappConsent ||
    existing.marketingConsent !== detail.marketingConsent ||
    existing.partnerReferralConsent !== detail.partnerReferralConsent ||
    existing.optOutDate !== detail.optOutDate;

  if (consentChanged) {
    await logAuditEvent({
      action: "consent.updated",
      entityType: "client_communication_preferences",
      entityId: clientId,
      summary: `Consent updated — email:${detail.emailConsent} sms:${detail.smsConsent} whatsapp:${detail.whatsappConsent} marketing:${detail.marketingConsent} partnerReferral:${detail.partnerReferralConsent}`,
    });
  }

  const statusChanged =
    !existing ||
    existing.whatsappContactStatus !== detail.whatsappContactStatus ||
    existing.emailStatus !== detail.emailStatus ||
    existing.smsStatus !== detail.smsStatus;

  if (statusChanged) {
    await logAuditEvent({
      action: "channel_status.updated",
      entityType: "client_communication_preferences",
      entityId: clientId,
      summary: `Channel status updated — whatsapp:${detail.whatsappContactStatus} email:${detail.emailStatus} sms:${detail.smsStatus}`,
    });
  }

  revalidatePath(`/clients/${clientId}`);
}
