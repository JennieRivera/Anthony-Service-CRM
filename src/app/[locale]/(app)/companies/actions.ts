"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  companies,
  companyOwners,
  companyContacts,
  companyAuthorizedRepresentatives,
  companyDocumentChecklistItems,
} from "@/lib/db/schema";
import {
  companyFormSchema,
  companyOwnerFormSchema,
  companyContactFormSchema,
  companyAuthorizedRepresentativeFormSchema,
  type CompanyFormValues,
  type CompanyOwnerFormValues,
  type CompanyContactFormValues,
  type CompanyAuthorizedRepresentativeFormValues,
} from "@/lib/validation/company";
import {
  companyDocumentChecklistItemFormSchema,
  type CompanyDocumentChecklistItemFormValues,
} from "@/lib/validation/companyDocumentChecklist";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { logAuditEvent } from "@/lib/audit";

function normalizeCompany(values: CompanyFormValues) {
  return {
    legalBusinessName: values.legalBusinessName,
    dbaName: values.dbaName || null,
    entityType: values.entityType || null,
    stateOfFormation: values.stateOfFormation || null,
    formationDate: values.formationDate || null,
    stateDocumentNumber: values.stateDocumentNumber || null,
    einStatus: values.einStatus,
    einLast4: values.einLast4 || null,
    registeredAgent: values.registeredAgent || null,
    registeredAgentAddress: values.registeredAgentAddress || null,
    principalBusinessAddress: values.principalBusinessAddress || null,
    mailingAddress: values.mailingAddress || null,
    phone: values.phone || null,
    email: values.email || null,
    website: values.website || null,
    industry: values.industry || null,
    naicsCode: values.naicsCode || null,
    businessDescription: values.businessDescription || null,
    yearsInBusiness: values.yearsInBusiness ? Number(values.yearsInBusiness) : null,
    numberOfEmployees: values.numberOfEmployees
      ? Number(values.numberOfEmployees)
      : null,
    annualRevenueRange: values.annualRevenueRange || null,
    monthlyRevenueRange: values.monthlyRevenueRange || null,
    fiscalYearEnd: values.fiscalYearEnd || null,
    accountingMethod: values.accountingMethod || null,
    bookkeepingSoftware: values.bookkeepingSoftware || null,
    payrollProvider: values.payrollProvider || null,
    salesTaxRequired: values.salesTaxRequired ?? false,
    salesTaxStates: values.salesTaxStates
      ? values.salesTaxStates
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      : null,
    licensesRequired: values.licensesRequired || null,
    insuranceStatus: values.insuranceStatus || null,
    bankingRelationship: values.bankingRelationship || null,
    businessCreditStatus: values.businessCreditStatus || null,
    fundingNeeds: values.fundingNeeds || null,
    notes: values.notes || null,
    updatedAt: new Date(),
  };
}

export async function createCompanyAction(rawValues: CompanyFormValues) {
  const values = companyFormSchema.parse(rawValues);
  const [created] = await getDb()
    .insert(companies)
    .values(normalizeCompany(values))
    .returning({ id: companies.id });

  await logAuditEvent({
    action: "company.created",
    entityType: "company",
    entityId: created.id,
    summary: `Created company "${values.legalBusinessName}"`,
  });

  revalidatePath("/companies");
  const locale = await getLocale();
  redirect({ href: `/companies/${created.id}`, locale });
}

export async function updateCompanyAction(
  id: string,
  rawValues: CompanyFormValues,
) {
  const values = companyFormSchema.parse(rawValues);

  await getDb()
    .update(companies)
    .set(normalizeCompany(values))
    .where(eq(companies.id, id));

  await logAuditEvent({
    action: "company.updated",
    entityType: "company",
    entityId: id,
    summary: `Updated company "${values.legalBusinessName}"`,
  });

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  const locale = await getLocale();
  redirect({ href: `/companies/${id}`, locale });
}

export async function createCompanyOwnerAction(
  companyId: string,
  rawValues: CompanyOwnerFormValues,
) {
  const values = companyOwnerFormSchema.parse(rawValues);
  await getDb()
    .insert(companyOwners)
    .values({
      companyId,
      clientId: values.clientId || null,
      name: values.name,
      role: values.role || null,
      ownershipPercentage: values.ownershipPercentage
        ? Number(values.ownershipPercentage).toFixed(2)
        : null,
      phone: values.phone || null,
      email: values.email || null,
      preferredLanguage: values.preferredLanguage || null,
      authorizedSigner: values.authorizedSigner ?? false,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      notes: values.notes || null,
    });

  await logAuditEvent({
    action: "company.owner_added",
    entityType: "company",
    entityId: companyId,
    summary: `Added owner "${values.name}"`,
  });

  revalidatePath(`/companies/${companyId}`);
}

export async function deleteCompanyOwnerAction(companyId: string, ownerId: string) {
  await getDb().delete(companyOwners).where(eq(companyOwners.id, ownerId));
  await logAuditEvent({
    action: "company.owner_removed",
    entityType: "company",
    entityId: companyId,
    summary: "Removed an owner",
  });
  revalidatePath(`/companies/${companyId}`);
}

export async function createCompanyContactAction(
  companyId: string,
  rawValues: CompanyContactFormValues,
) {
  const values = companyContactFormSchema.parse(rawValues);
  await getDb()
    .insert(companyContacts)
    .values({
      companyId,
      clientId: values.clientId || null,
      name: values.name,
      role: values.role || null,
      phone: values.phone || null,
      email: values.email || null,
      notes: values.notes || null,
    });

  await logAuditEvent({
    action: "company.contact_added",
    entityType: "company",
    entityId: companyId,
    summary: `Added contact "${values.name}"`,
  });

  revalidatePath(`/companies/${companyId}`);
}

export async function deleteCompanyContactAction(
  companyId: string,
  contactId: string,
) {
  await getDb().delete(companyContacts).where(eq(companyContacts.id, contactId));
  await logAuditEvent({
    action: "company.contact_removed",
    entityType: "company",
    entityId: companyId,
    summary: "Removed a contact",
  });
  revalidatePath(`/companies/${companyId}`);
}

export async function createCompanyAuthorizedRepresentativeAction(
  companyId: string,
  rawValues: CompanyAuthorizedRepresentativeFormValues,
) {
  const values = companyAuthorizedRepresentativeFormSchema.parse(rawValues);
  await getDb()
    .insert(companyAuthorizedRepresentatives)
    .values({
      companyId,
      clientId: values.clientId || null,
      name: values.name,
      role: values.role || null,
      phone: values.phone || null,
      email: values.email || null,
      notes: values.notes || null,
    });

  await logAuditEvent({
    action: "company.representative_added",
    entityType: "company",
    entityId: companyId,
    summary: `Added authorized representative "${values.name}"`,
  });

  revalidatePath(`/companies/${companyId}`);
}

export async function deleteCompanyAuthorizedRepresentativeAction(
  companyId: string,
  representativeId: string,
) {
  await getDb()
    .delete(companyAuthorizedRepresentatives)
    .where(eq(companyAuthorizedRepresentatives.id, representativeId));
  await logAuditEvent({
    action: "company.representative_removed",
    entityType: "company",
    entityId: companyId,
    summary: "Removed an authorized representative",
  });
  revalidatePath(`/companies/${companyId}`);
}

export async function createCompanyChecklistItemAction(
  companyId: string,
  rawValues: CompanyDocumentChecklistItemFormValues,
) {
  const values = companyDocumentChecklistItemFormSchema.parse(rawValues);
  await getDb()
    .insert(companyDocumentChecklistItems)
    .values({
      companyId,
      category: values.category,
      description: values.description || null,
      status: values.status,
      dueDate: values.dueDate || null,
      notes: values.notes || null,
    });

  await logAuditEvent({
    action: "company.checklist_item_added",
    entityType: "company",
    entityId: companyId,
    summary: `Added document checklist item "${values.category}"`,
  });

  revalidatePath(`/companies/${companyId}`);
}

export async function updateCompanyChecklistItemAction(
  companyId: string,
  itemId: string,
  rawValues: CompanyDocumentChecklistItemFormValues,
) {
  const values = companyDocumentChecklistItemFormSchema.parse(rawValues);
  await getDb()
    .update(companyDocumentChecklistItems)
    .set({
      category: values.category,
      description: values.description || null,
      status: values.status,
      dueDate: values.dueDate || null,
      notes: values.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(companyDocumentChecklistItems.id, itemId));

  await logAuditEvent({
    action: "company.checklist_item_updated",
    entityType: "company",
    entityId: companyId,
    summary: `Updated document checklist item "${values.category}"`,
  });

  revalidatePath(`/companies/${companyId}`);
}

export async function deleteCompanyChecklistItemAction(
  companyId: string,
  itemId: string,
) {
  await getDb()
    .delete(companyDocumentChecklistItems)
    .where(eq(companyDocumentChecklistItems.id, itemId));

  await logAuditEvent({
    action: "company.checklist_item_removed",
    entityType: "company",
    entityId: companyId,
    summary: "Removed a document checklist item",
  });

  revalidatePath(`/companies/${companyId}`);
}
