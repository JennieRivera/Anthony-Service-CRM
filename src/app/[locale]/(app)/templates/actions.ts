"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { messageTemplates } from "@/lib/db/schema";
import {
  messageTemplateFormSchema,
  type MessageTemplateFormValues,
} from "@/lib/validation/messageTemplate";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { logAuditEvent } from "@/lib/audit";

function normalize(values: MessageTemplateFormValues) {
  return {
    name: values.name,
    language: values.language,
    channel: values.channel,
    category: values.category,
    subject: values.subject || null,
    messageBody: values.messageBody,
    active: values.active ?? true,
    updatedAt: new Date(),
  };
}

export async function createMessageTemplateAction(
  rawValues: MessageTemplateFormValues,
) {
  const values = messageTemplateFormSchema.parse(rawValues);
  const session = await auth();

  const [created] = await getDb()
    .insert(messageTemplates)
    .values({ ...normalize(values), createdByEmail: session?.user?.email ?? null })
    .returning({ id: messageTemplates.id });

  await logAuditEvent({
    action: "template.created",
    entityType: "message_template",
    entityId: created.id,
    summary: `Created template "${values.name}" (${values.category}, ${values.language})`,
  });

  revalidatePath("/templates");
  const locale = await getLocale();
  redirect({ href: `/templates/${created.id}`, locale });
}

export async function updateMessageTemplateAction(
  id: string,
  rawValues: MessageTemplateFormValues,
) {
  const values = messageTemplateFormSchema.parse(rawValues);

  await getDb()
    .update(messageTemplates)
    .set(normalize(values))
    .where(eq(messageTemplates.id, id));

  await logAuditEvent({
    action: "template.updated",
    entityType: "message_template",
    entityId: id,
    summary: `Updated template "${values.name}" (active: ${values.active ?? true})`,
  });

  revalidatePath("/templates");
  revalidatePath(`/templates/${id}`);
  const locale = await getLocale();
  redirect({ href: `/templates/${id}`, locale });
}
