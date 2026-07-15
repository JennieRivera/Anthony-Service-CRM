"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { conversationMessages } from "@/lib/db/schema";
import {
  conversationMessageFormSchema,
  type ConversationMessageFormValues,
} from "@/lib/validation/conversation";

export async function createConversationMessageAction(
  rawValues: ConversationMessageFormValues,
) {
  const values = conversationMessageFormSchema.parse(rawValues);

  await getDb()
    .insert(conversationMessages)
    .values({
      clientId: values.clientId,
      caseId: values.caseId || null,
      channel: values.channel,
      direction: values.direction,
      occurredAt: new Date(values.occurredAt),
      subject: values.subject || null,
      summary: values.summary,
      durationMinutes: values.durationMinutes
        ? Number(values.durationMinutes)
        : null,
      counterpart: values.counterpart || null,
    });

  revalidatePath(`/clients/${values.clientId}`);
}
