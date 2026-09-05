"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  facebookMessengerThreads,
  instagramDmThreads,
  websiteChatSessions,
  serviceTypeEnum,
} from "@/lib/db/schema";
import {
  facebookThreadFormSchema,
  instagramThreadFormSchema,
  websiteChatSessionFormSchema,
  metaChannelStatusValues,
  type FacebookThreadFormValues,
  type InstagramThreadFormValues,
  type WebsiteChatSessionFormValues,
} from "@/lib/validation/socialChannels";
import { logAuditEvent } from "@/lib/audit";

export async function createFacebookThreadAction(
  rawValues: FacebookThreadFormValues,
) {
  const values = facebookThreadFormSchema.parse(rawValues);
  const [created] = await getDb()
    .insert(facebookMessengerThreads)
    .values({
      clientId: values.clientId || null,
      caseId: values.caseId || null,
      facebookProfile: values.facebookProfile,
      status: values.status,
      followUpDate: values.followUpDate || null,
    })
    .returning({ id: facebookMessengerThreads.id });
  await logAuditEvent({
    action: "communication.created",
    entityType: "facebook_messenger_thread",
    entityId: created.id,
    summary: `Created Facebook thread for ${values.facebookProfile}`,
  });
  revalidatePath("/communications");
}

export async function updateFacebookThreadStatusAction(
  id: string,
  status: (typeof metaChannelStatusValues)[number],
) {
  await getDb()
    .update(facebookMessengerThreads)
    .set({ status, updatedAt: new Date() })
    .where(eq(facebookMessengerThreads.id, id));
  await logAuditEvent({
    action: "channel_status.updated",
    entityType: "facebook_messenger_thread",
    entityId: id,
    summary: `Facebook thread status set to ${status}`,
  });
  revalidatePath("/communications");
}

export async function createInstagramThreadAction(
  rawValues: InstagramThreadFormValues,
) {
  const values = instagramThreadFormSchema.parse(rawValues);
  const [created] = await getDb()
    .insert(instagramDmThreads)
    .values({
      clientId: values.clientId || null,
      caseId: values.caseId || null,
      instagramUsername: values.instagramUsername,
      status: values.status,
      followUpDate: values.followUpDate || null,
    })
    .returning({ id: instagramDmThreads.id });
  await logAuditEvent({
    action: "communication.created",
    entityType: "instagram_dm_thread",
    entityId: created.id,
    summary: `Created Instagram thread for ${values.instagramUsername}`,
  });
  revalidatePath("/communications");
}

export async function updateInstagramThreadStatusAction(
  id: string,
  status: (typeof metaChannelStatusValues)[number],
) {
  await getDb()
    .update(instagramDmThreads)
    .set({ status, updatedAt: new Date() })
    .where(eq(instagramDmThreads.id, id));
  await logAuditEvent({
    action: "channel_status.updated",
    entityType: "instagram_dm_thread",
    entityId: id,
    summary: `Instagram thread status set to ${status}`,
  });
  revalidatePath("/communications");
}

export async function createWebsiteChatSessionAction(
  rawValues: WebsiteChatSessionFormValues,
) {
  const values = websiteChatSessionFormSchema.parse(rawValues);
  const [created] = await getDb()
    .insert(websiteChatSessions)
    .values({
      clientId: values.clientId || null,
      websiteSource: values.websiteSource,
      visitorName: values.visitorName || null,
      visitorEmail: values.visitorEmail || null,
      visitorPhone: values.visitorPhone || null,
      language: values.language || null,
      serviceInterest:
        (values.serviceInterest as (typeof serviceTypeEnum.enumValues)[number]) ||
        null,
      message: values.message,
      conversationStatus: values.conversationStatus,
      followUpDate: values.followUpDate || null,
    })
    .returning({ id: websiteChatSessions.id });
  await logAuditEvent({
    action: "communication.created",
    entityType: "website_chat_session",
    entityId: created.id,
    summary: `Created website chat entry from ${values.websiteSource}`,
  });
  revalidatePath("/communications");
}

export async function updateWebsiteChatStatusAction(
  id: string,
  conversationStatus: WebsiteChatSessionFormValues["conversationStatus"],
) {
  await getDb()
    .update(websiteChatSessions)
    .set({ conversationStatus, updatedAt: new Date() })
    .where(eq(websiteChatSessions.id, id));
  await logAuditEvent({
    action: "channel_status.updated",
    entityType: "website_chat_session",
    entityId: id,
    summary: `Website chat status set to ${conversationStatus}`,
  });
  revalidatePath("/communications");
}
