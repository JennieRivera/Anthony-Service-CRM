"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { associationsChambers } from "@/lib/db/schema";
import {
  associationChamberFormSchema,
  type AssociationChamberFormValues,
} from "@/lib/validation/associationChamber";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { logAuditEvent } from "@/lib/audit";

function normalize(values: AssociationChamberFormValues) {
  return {
    organizationName: values.organizationName,
    organizationType: values.organizationType,
    state: values.state || null,
    city: values.city || null,
    country: values.country || null,
    website: values.website || null,
    phone: values.phone || null,
    email: values.email || null,
    contactPerson: values.contactPerson || null,
    industryFocus: values.industryFocus || null,
    latinoFocus: values.latinoFocus ?? false,
    membershipStatus: values.membershipStatus || null,
    membershipCost: values.membershipCost || null,
    amsRelationshipStatus: values.amsRelationshipStatus,
    dateContacted: values.dateContacted || null,
    lastContact: values.lastContact || null,
    nextFollowUp: values.nextFollowUp || null,
    partnershipOpportunity: values.partnershipOpportunity || null,
    notes: values.notes || null,
    updatedAt: new Date(),
  };
}

export async function createAssociationChamberAction(
  rawValues: AssociationChamberFormValues,
) {
  const values = associationChamberFormSchema.parse(rawValues);
  const [created] = await getDb()
    .insert(associationsChambers)
    .values(normalize(values))
    .returning({ id: associationsChambers.id });

  await logAuditEvent({
    action: "association_chamber.created",
    entityType: "association_chamber",
    entityId: created.id,
    summary: `Added association/chamber "${values.organizationName}"`,
  });

  revalidatePath("/associations");
  const locale = await getLocale();
  redirect({ href: `/associations/${created.id}`, locale });
}

export async function updateAssociationChamberAction(
  id: string,
  rawValues: AssociationChamberFormValues,
) {
  const values = associationChamberFormSchema.parse(rawValues);

  await getDb()
    .update(associationsChambers)
    .set(normalize(values))
    .where(eq(associationsChambers.id, id));

  await logAuditEvent({
    action: "association_chamber.updated",
    entityType: "association_chamber",
    entityId: id,
    summary: `Updated association/chamber "${values.organizationName}"`,
  });

  revalidatePath("/associations");
  revalidatePath(`/associations/${id}`);
  const locale = await getLocale();
  redirect({ href: `/associations/${id}`, locale });
}
