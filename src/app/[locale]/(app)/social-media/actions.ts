"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { socialMediaContent } from "@/lib/db/schema";
import {
  socialMediaContentFormSchema,
  type SocialMediaContentFormValues,
} from "@/lib/validation/socialMedia";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";

function normalize(values: SocialMediaContentFormValues) {
  return {
    title: values.title,
    platform: values.platform,
    contentType: values.contentType,
    campaign: values.campaign || null,
    brand: values.brand || null,
    serviceType: values.serviceType || null,
    audience: values.audience || null,
    language: values.language || null,
    caption: values.caption || null,
    hashtags: values.hashtags || null,
    callToAction: values.callToAction || null,
    mediaAssetId: values.mediaAssetId || null,
    status: values.status,
    scheduledDate: values.scheduledDate || null,
    publishedDate: values.publishedDate || null,
    postUrl: values.postUrl || null,
    performanceStatus: values.performanceStatus,
    approvalRequired: values.approvalRequired ?? false,
    approvedBy: values.approvedBy || null,
    approvalDate: values.approvalDate || null,
    partnerApprovalRequired: values.partnerApprovalRequired ?? false,
    partnerApprovalStatus: values.partnerApprovalStatus,
    notes: values.notes || null,
    updatedAt: new Date(),
  };
}

export async function createSocialMediaContentAction(
  rawValues: SocialMediaContentFormValues,
) {
  const values = socialMediaContentFormSchema.parse(rawValues);
  const session = await auth();
  const db = getDb();

  const [created] = await db
    .insert(socialMediaContent)
    .values({
      ...normalize(values),
      createdByEmail: session?.user?.email ?? null,
    })
    .returning({ id: socialMediaContent.id });

  revalidatePath("/social-media");
  const locale = await getLocale();
  redirect({ href: `/social-media/${created.id}`, locale });
}

export async function updateSocialMediaContentAction(
  id: string,
  rawValues: SocialMediaContentFormValues,
) {
  const values = socialMediaContentFormSchema.parse(rawValues);
  const db = getDb();

  await db
    .update(socialMediaContent)
    .set(normalize(values))
    .where(eq(socialMediaContent.id, id));

  revalidatePath("/social-media");
  revalidatePath(`/social-media/${id}`);
  const locale = await getLocale();
  redirect({ href: `/social-media/${id}`, locale });
}
