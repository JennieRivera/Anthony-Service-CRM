"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  strategicAlliances,
  allianceStatusHistory,
  allianceStatusEnum,
  allianceContacts,
  allianceDocuments,
  allianceDocumentTypeEnum,
} from "@/lib/db/schema";
import {
  allianceFormSchema,
  type AllianceFormValues,
} from "@/lib/validation/alliance";
import {
  allianceContactFormSchema,
  type AllianceContactFormValues,
} from "@/lib/validation/allianceContact";
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
    contactClientId: values.contactClientId || null,
    companyId: values.companyId || null,
    organizationType: values.organizationType || null,
    phone: values.phone || null,
    email: values.email || null,
    website: values.website || null,
    city: values.city || null,
    state: values.state || null,
    country: values.country || null,
    relationshipOwner: values.relationshipOwner || null,
    dateIntroduced: values.dateIntroduced || null,
    agreementStartDate: values.agreementStartDate || null,
    agreementRenewalDate: values.agreementRenewalDate || null,
    servicesConnected: values.servicesConnected || null,
    referralAgreement: values.referralAgreement ?? false,
    commissionAgreement: values.commissionAgreement ?? false,
    marketingPermission: values.marketingPermission ?? false,
    logoPermission: values.logoPermission ?? false,
    lastContact: values.lastContact || null,
    nextFollowUp: values.nextFollowUp || null,
    status: values.status,
    notes: values.notes || null,
    amsResponsibilities: values.amsResponsibilities || null,
    partnerResponsibilities: values.partnerResponsibilities || null,
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
  revalidatePath("/community");
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
  revalidatePath("/community");
  revalidatePath(`/alliances/${id}`);
  const locale = await getLocale();
  redirect({ href: `/alliances/${id}`, locale });
}

// Phase 1.5B — B2B Alliances enhancement. One alliance can now have
// several contacts; clientId is optional on purpose (a B2B contact is
// not automatically a service client — see schema.ts comment on
// allianceContacts). Does not redirect: this is called from a dialog on
// the already-loaded alliance detail page, same pattern as
// createDiamondMemberAction.
export async function createAllianceContactAction(
  allianceId: string,
  rawValues: AllianceContactFormValues,
) {
  const values = allianceContactFormSchema.parse(rawValues);

  await getDb()
    .insert(allianceContacts)
    .values({
      allianceId,
      clientId: values.clientId || null,
      name: values.name,
      role: values.role || null,
      phone: values.phone || null,
      email: values.email || null,
      notes: values.notes || null,
    });

  revalidatePath(`/alliances/${allianceId}`);
}

export async function deleteAllianceContactAction(allianceId: string, contactId: string) {
  await getDb().delete(allianceContacts).where(eq(allianceContacts.id, contactId));
  revalidatePath(`/alliances/${allianceId}`);
}

// Classifies a document uploaded before documentType existed (or any
// document staff hasn't categorized yet) — never required, never
// auto-assigned; "other" is a conscious staff choice, not a default.
export async function updateAllianceDocumentTypeAction(
  allianceId: string,
  documentId: string,
  documentType: (typeof allianceDocumentTypeEnum.enumValues)[number],
) {
  await getDb()
    .update(allianceDocuments)
    .set({ documentType })
    .where(eq(allianceDocuments.id, documentId));

  revalidatePath(`/alliances/${allianceId}`);
}
