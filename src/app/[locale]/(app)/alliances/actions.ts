"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  strategicAlliances,
  allianceStatusHistory,
  allianceStatusEnum,
} from "@/lib/db/schema";
import {
  allianceFormSchema,
  type AllianceFormValues,
} from "@/lib/validation/alliance";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";

async function recordStatusChange(
  allianceId: string,
  previousStatus: (typeof allianceStatusEnum.enumValues)[number] | null,
  newStatus: (typeof allianceStatusEnum.enumValues)[number],
) {
  const session = await auth();
  await getDb()
    .insert(allianceStatusHistory)
    .values({
      allianceId,
      previousStatus,
      newStatus,
      changedByEmail: session?.user?.email ?? null,
    });
}

function normalize(values: AllianceFormValues) {
  return {
    organizationName: values.organizationName,
    contactPerson: values.contactPerson || null,
    organizationType: values.organizationType || null,
    phone: values.phone || null,
    email: values.email || null,
    website: values.website || null,
    state: values.state || null,
    country: values.country || null,
    relationshipOwner: values.relationshipOwner || null,
    dateIntroduced: values.dateIntroduced || null,
    servicesConnected: values.servicesConnected || null,
    referralAgreement: values.referralAgreement ?? false,
    commissionAgreement: values.commissionAgreement ?? false,
    marketingPermission: values.marketingPermission ?? false,
    logoPermission: values.logoPermission ?? false,
    lastContact: values.lastContact || null,
    nextFollowUp: values.nextFollowUp || null,
    status: values.status,
    notes: values.notes || null,
    updatedAt: new Date(),
  };
}

export async function createAllianceAction(rawValues: AllianceFormValues) {
  const values = allianceFormSchema.parse(rawValues);
  const db = getDb();

  const [created] = await db
    .insert(strategicAlliances)
    .values(normalize(values))
    .returning({ id: strategicAlliances.id });

  await recordStatusChange(created.id, null, values.status);

  revalidatePath("/alliances");
  const locale = await getLocale();
  redirect({ href: `/alliances/${created.id}`, locale });
}

export async function updateAllianceAction(
  id: string,
  rawValues: AllianceFormValues,
) {
  const values = allianceFormSchema.parse(rawValues);
  const db = getDb();

  const [existing] = await db
    .select({ status: strategicAlliances.status })
    .from(strategicAlliances)
    .where(eq(strategicAlliances.id, id))
    .limit(1);

  await db
    .update(strategicAlliances)
    .set(normalize(values))
    .where(eq(strategicAlliances.id, id));

  if (existing && existing.status !== values.status) {
    await recordStatusChange(id, existing.status, values.status);
  }

  revalidatePath("/alliances");
  revalidatePath(`/alliances/${id}`);
  const locale = await getLocale();
  redirect({ href: `/alliances/${id}`, locale });
}
