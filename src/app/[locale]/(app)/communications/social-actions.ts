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

export async function createFacebookThreadAction(
  rawValues: FacebookThreadFormValues,
) {
  const values = facebookThreadFormSchema.parse(rawValues);
  await getDb()
    .insert(facebookMessengerThreads)
    .values({
      clientId: values.clientId || null,
      caseId: values.caseId || null,
      facebookProfile: values.facebookProfile,
      status: values.status,
      followUpDate: values.followUpDate || null,
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
  revalidatePath("/communications");
}

export async function createInstagramThreadAction(
  rawValues: InstagramThreadFormValues,
) {
  const values = instagramThreadFormSchema.parse(rawValues);
  await getDb()
    .insert(instagramDmThreads)
    .values({
      clientId: values.clientId || null,
      caseId: values.caseId || null,
      instagramUsername: values.instagramUsername,
      status: values.status,
      followUpDate: values.followUpDate || null,
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
  revalidatePath("/communications");
}

export async function createWebsiteChatSessionAction(
  rawValues: WebsiteChatSessionFormValues,
) {
  const values = websiteChatSessionFormSchema.parse(rawValues);
  await getDb()
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
  revalidatePath("/communications");
}
