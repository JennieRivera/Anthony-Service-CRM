"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { clientCommunicationPreferences } from "@/lib/db/schema";
import {
  communicationPreferencesFormSchema,
  type CommunicationPreferencesFormValues,
} from "@/lib/validation/communicationPreferences";

export async function upsertCommunicationPreferencesAction(
  clientId: string,
  rawValues: CommunicationPreferencesFormValues,
) {
  const values = communicationPreferencesFormSchema.parse(rawValues);

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

  revalidatePath(`/clients/${clientId}`);
}
