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
import {
  allianceNetworkFormSchema,
  type AllianceNetworkFormValues,
} from "@/lib/validation/allianceNetwork";
import {
  createAllianceNetworkRelationship,
  deleteAllianceNetworkRelationship,
  allianceNetworkRelationshipExists,
} from "@/lib/queries/alliances";
import {
  assignMembershipFormSchema,
  updateMembershipTermsFormSchema,
  changeMembershipStatusFormSchema,
  linkInvoiceFormSchema,
  benefitOverrideFormSchema,
  type AssignMembershipFormValues,
  type UpdateMembershipTermsFormValues,
  type ChangeMembershipStatusFormValues,
  type LinkInvoiceFormValues,
  type BenefitOverrideFormValues,
} from "@/lib/validation/membership";
import {
  assignAllianceMembership,
  updateAllianceMembershipTerms,
  changeMembershipStatus,
  linkInvoiceToMembership,
  addBenefitOverride,
  removeBenefitOverride,
  getCurrentMembershipForAlliance,
  getMembershipPlanById,
} from "@/lib/queries/memberships";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { requireAccessArea, getCurrentRole, canAccessArea } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";

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
  // B2B Network Foundation, section 14 — every mutation below is gated
  // server-side on the same "alliances" AccessArea already defined in
  // Phase 2H (currently granted to community_manager and the admin-tier
  // roles) — not a new permission, not broadened for convenience.
  await requireAccessArea("alliances");
  const values = allianceFormSchema.parse(rawValues);
  const db = getDb();

  const [created] = await db
    .insert(strategicAlliances)
    .values(normalize(values))
    .returning({ id: strategicAlliances.id });

  await recordStatusChange(created.id, null, values.status);
  await logAuditEvent({
    action: "alliance.created",
    entityType: "alliance",
    entityId: created.id,
    summary: `Created B2B Alliance "${values.organizationName}"`,
  });

  revalidatePath("/alliances");
  revalidatePath("/community");
  const locale = await getLocale();
  redirect({ href: `/alliances/${created.id}`, locale });
}

export async function updateAllianceAction(
  id: string,
  rawValues: AllianceFormValues,
) {
  await requireAccessArea("alliances");
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
  await logAuditEvent({
    action: "alliance.updated",
    entityType: "alliance",
    entityId: id,
    summary: `Updated B2B Alliance "${values.organizationName}"`,
  });

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
  await requireAccessArea("alliances");
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
  await logAuditEvent({
    action: "alliance.contact_added",
    entityType: "alliance",
    entityId: allianceId,
    summary: `Added contact "${values.name}"${values.role ? ` (${values.role})` : ""}`,
  });

  revalidatePath(`/alliances/${allianceId}`);
}

export async function deleteAllianceContactAction(allianceId: string, contactId: string) {
  await requireAccessArea("alliances");
  const [deleted] = await getDb()
    .delete(allianceContacts)
    .where(eq(allianceContacts.id, contactId))
    .returning({ name: allianceContacts.name });
  if (deleted) {
    await logAuditEvent({
      action: "alliance.contact_removed",
      entityType: "alliance",
      entityId: allianceId,
      summary: `Removed contact "${deleted.name}"`,
    });
  }
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
  await requireAccessArea("alliances");
  await getDb()
    .update(allianceDocuments)
    .set({ documentType })
    .where(eq(allianceDocuments.id, documentId));

  revalidatePath(`/alliances/${allianceId}`);
}

// B2B Network Foundation, section 5 — records that `allianceId`
// introduced `introducedAllianceId`. NETWORK PROVENANCE ONLY: this never
// touches referrals, invoices, payments, or memberships — see the
// comment on allianceNetworkRelationships in schema.ts. Self-link and
// the exact-duplicate-pair case are both checked here before inserting
// (same SELECT-then-INSERT pattern as createAuthorizedUser) rather than
// by catching the table's unique-index violation — the neon-http
// driver's error message doesn't reliably contain "unique"/"duplicate"
// for a regex match to key off, so that approach silently leaked a raw
// SQL error to the user instead of a friendly one (caught in testing).
// The unique index itself is kept as the real guarantee against a race
// between two concurrent requests, just not what this code parses.
export async function createAllianceNetworkRelationshipAction(
  allianceId: string,
  rawValues: AllianceNetworkFormValues,
) {
  await requireAccessArea("alliances");
  const values = allianceNetworkFormSchema.parse(rawValues);

  if (values.introducedAllianceId === allianceId) {
    throw new Error("An alliance cannot introduce itself.");
  }

  const alreadyExists = await allianceNetworkRelationshipExists(
    allianceId,
    values.introducedAllianceId,
  );
  if (alreadyExists) {
    throw new Error("This network connection has already been recorded.");
  }

  const [referringAlliance, introducedAlliance] = await Promise.all([
    getDb()
      .select({ organizationName: strategicAlliances.organizationName })
      .from(strategicAlliances)
      .where(eq(strategicAlliances.id, allianceId))
      .limit(1)
      .then((r) => r[0]),
    getDb()
      .select({ organizationName: strategicAlliances.organizationName })
      .from(strategicAlliances)
      .where(eq(strategicAlliances.id, values.introducedAllianceId))
      .limit(1)
      .then((r) => r[0]),
  ]);
  if (!introducedAlliance) {
    throw new Error("The selected alliance was not found.");
  }

  const session = await auth();

  await createAllianceNetworkRelationship({
    referringAllianceId: allianceId,
    introducedAllianceId: values.introducedAllianceId,
    relationshipDate: values.relationshipDate || null,
    notes: values.notes || null,
    recordedByEmail: session?.user?.email ?? null,
  });

  // Logged on both sides — the introduction is a fact about both
  // alliances, so both alliance profiles' Activity sections should show
  // it, not just the one the action was initiated from.
  await Promise.all([
    logAuditEvent({
      action: "alliance.network_relationship.created",
      entityType: "alliance",
      entityId: allianceId,
      summary: `Recorded network introduction: this alliance introduced "${introducedAlliance.organizationName}"`,
    }),
    logAuditEvent({
      action: "alliance.network_relationship.created",
      entityType: "alliance",
      entityId: values.introducedAllianceId,
      summary: `Recorded network introduction: introduced by "${referringAlliance?.organizationName ?? "another alliance"}"`,
    }),
  ]);

  revalidatePath(`/alliances/${allianceId}`);
  revalidatePath(`/alliances/${values.introducedAllianceId}`);
}

export async function deleteAllianceNetworkRelationshipAction(
  allianceId: string,
  relationshipId: string,
) {
  await requireAccessArea("alliances");
  const deleted = await deleteAllianceNetworkRelationship(relationshipId);
  if (deleted) {
    await Promise.all([
      logAuditEvent({
        action: "alliance.network_relationship.removed",
        entityType: "alliance",
        entityId: deleted.referringAllianceId,
        summary: "Removed a network introduction record",
      }),
      logAuditEvent({
        action: "alliance.network_relationship.removed",
        entityType: "alliance",
        entityId: deleted.introducedAllianceId,
        summary: "Removed a network introduction record",
      }),
    ]);
    revalidatePath(`/alliances/${deleted.referringAllianceId}`);
    revalidatePath(`/alliances/${deleted.introducedAllianceId}`);
  }
}

// ===================================================================
// B2B Memberships & Benefits — alliance-specific membership actions.
// Full membership administration (assign/change plan, change status,
// edit terms, benefit overrides) is gated on "b2b_membership"
// (community_manager + admin-tier roles). Invoice linking alone is
// additionally gated to allow "b2b_membership_billing" (bookkeeping_staff)
// — see the AccessArea comment in permissions.ts.

export async function assignMembershipAction(allianceId: string, rawValues: AssignMembershipFormValues) {
  await requireAccessArea("b2b_membership");
  const values = assignMembershipFormSchema.parse(rawValues);

  const plan = await getMembershipPlanById(values.planId);
  if (!plan) throw new Error("Selected plan not found");

  const session = await auth();
  await assignAllianceMembership({
    allianceId,
    planId: values.planId,
    planNameSnapshot: plan.plan.name,
    feeType: values.feeType,
    waivedReason: values.waivedReason || null,
    priceSnapshot: values.priceOverride || plan.plan.price,
    billingFrequencySnapshot: plan.plan.billingFrequency,
    startDate: values.startDate || null,
    renewalDate: values.renewalDate || null,
    notes: values.notes || null,
    createdByEmail: session?.user?.email ?? null,
  });

  await logAuditEvent({
    action: "alliance.membership_assigned",
    entityType: "alliance",
    entityId: allianceId,
    summary: `Assigned membership plan "${plan.plan.name}" (${values.feeType})`,
  });

  revalidatePath(`/alliances/${allianceId}`);
}

export async function updateMembershipTermsAction(allianceId: string, rawValues: UpdateMembershipTermsFormValues) {
  await requireAccessArea("b2b_membership");
  const values = updateMembershipTermsFormSchema.parse(rawValues);

  const current = await getCurrentMembershipForAlliance(allianceId);
  if (!current) throw new Error("No membership exists for this alliance yet");

  await updateAllianceMembershipTerms(current.id, {
    feeType: values.feeType,
    waivedReason: values.waivedReason || null,
    startDate: values.startDate || null,
    renewalDate: values.renewalDate || null,
    notes: values.notes || null,
  });

  await logAuditEvent({
    action: "alliance.membership_terms_updated",
    entityType: "alliance",
    entityId: allianceId,
    summary: `Updated membership terms (${values.feeType})`,
  });

  revalidatePath(`/alliances/${allianceId}`);
}

export async function changeMembershipStatusAction(allianceId: string, rawValues: ChangeMembershipStatusFormValues) {
  await requireAccessArea("b2b_membership");
  const values = changeMembershipStatusFormSchema.parse(rawValues);

  const current = await getCurrentMembershipForAlliance(allianceId);
  if (!current) throw new Error("No membership exists for this alliance yet");

  const session = await auth();
  await changeMembershipStatus(current.id, values.status, values.note || null, session?.user?.email ?? null);

  await logAuditEvent({
    action: "alliance.membership_status_changed",
    entityType: "alliance",
    entityId: allianceId,
    summary: `Membership status changed: ${current.status} -> ${values.status}`,
  });

  revalidatePath(`/alliances/${allianceId}`);
}

// Deliberately the only membership mutation also reachable with
// "b2b_membership_billing" alone (bookkeeping_staff) — linking/
// unlinking an existing Invoice is the one membership action their
// role needs, per the brief's "financial visibility/linking appropriate
// to membership billing" instruction.
export async function linkMembershipInvoiceAction(allianceId: string, rawValues: LinkInvoiceFormValues) {
  // Either area is sufficient — pick whichever the role actually has so
  // the single requireAccessArea call below both succeeds correctly for
  // either role and logs a denial only once when neither applies.
  const role = await getCurrentRole();
  const area =
    role && canAccessArea(role, "b2b_membership") ? "b2b_membership" : "b2b_membership_billing";
  await requireAccessArea(area);
  const values = linkInvoiceFormSchema.parse(rawValues);

  const current = await getCurrentMembershipForAlliance(allianceId);
  if (!current) throw new Error("No membership exists for this alliance yet");

  await linkInvoiceToMembership(current.id, values.invoiceId || null);

  await logAuditEvent({
    action: values.invoiceId ? "alliance.membership_invoice_linked" : "alliance.membership_invoice_unlinked",
    entityType: "alliance",
    entityId: allianceId,
    summary: values.invoiceId ? "Linked an invoice to the current membership" : "Unlinked the membership's invoice",
  });

  revalidatePath(`/alliances/${allianceId}`);
}

export async function addMembershipBenefitOverrideAction(allianceId: string, rawValues: BenefitOverrideFormValues) {
  await requireAccessArea("b2b_membership");
  const values = benefitOverrideFormSchema.parse(rawValues);

  const current = await getCurrentMembershipForAlliance(allianceId);
  if (!current) throw new Error("No membership exists for this alliance yet");

  const session = await auth();
  await addBenefitOverride({
    membershipId: current.id,
    benefitId: values.benefitId,
    overrideType: values.overrideType,
    note: values.note || null,
    createdByEmail: session?.user?.email ?? null,
  });

  await logAuditEvent({
    action: "alliance.membership_benefit_override_added",
    entityType: "alliance",
    entityId: allianceId,
    summary: `Added a benefit ${values.overrideType === "include" ? "inclusion" : "exclusion"} override`,
  });

  revalidatePath(`/alliances/${allianceId}`);
}

export async function removeMembershipBenefitOverrideAction(allianceId: string, overrideId: string) {
  await requireAccessArea("b2b_membership");
  const deleted = await removeBenefitOverride(overrideId);
  if (deleted) {
    await logAuditEvent({
      action: "alliance.membership_benefit_override_removed",
      entityType: "alliance",
      entityId: allianceId,
      summary: "Removed a benefit override",
    });
  }
  revalidatePath(`/alliances/${allianceId}`);
}
