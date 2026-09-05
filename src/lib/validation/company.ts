import { z } from "zod";

export const companyEntityTypeValues = [
  "llc",
  "corporation",
  "s_corporation",
  "partnership",
  "sole_proprietor",
  "nonprofit",
  "other",
] as const;

export const companyEinStatusValues = ["not_started", "applied", "received"] as const;

export const companyAccountingMethodValues = ["cash", "accrual"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const companyFormSchema = z.object({
  legalBusinessName: z.string().trim().min(1, "Legal business name is required"),
  dbaName: optionalString,
  entityType: z.enum(companyEntityTypeValues).optional().or(z.literal("")),
  stateOfFormation: optionalString,
  formationDate: optionalString,
  stateDocumentNumber: optionalString,
  einStatus: z.enum(companyEinStatusValues),
  einLast4: z
    .string()
    .trim()
    .regex(/^\d{0,4}$/, "Last 4 digits only")
    .optional()
    .or(z.literal("")),
  registeredAgent: optionalString,
  registeredAgentAddress: optionalString,
  principalBusinessAddress: optionalString,
  mailingAddress: optionalString,
  phone: optionalString,
  email: optionalString,
  website: optionalString,
  industry: optionalString,
  naicsCode: optionalString,
  businessDescription: optionalString,
  yearsInBusiness: optionalString,
  numberOfEmployees: optionalString,
  annualRevenueRange: optionalString,
  monthlyRevenueRange: optionalString,
  fiscalYearEnd: optionalString,
  accountingMethod: z.enum(companyAccountingMethodValues).optional().or(z.literal("")),
  bookkeepingSoftware: optionalString,
  payrollProvider: optionalString,
  salesTaxRequired: z.boolean().optional(),
  // Simple comma-separated state abbreviation list for now (e.g. "FL, GA,
  // NY") rather than a full 50-state picker — revisit once the Sales Tax
  // module (a later Phase 5 session) needs richer per-state data anyway.
  salesTaxStates: optionalString,
  licensesRequired: optionalString,
  insuranceStatus: optionalString,
  bankingRelationship: optionalString,
  businessCreditStatus: optionalString,
  fundingNeeds: optionalString,
  notes: optionalString,
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

const optionalLanguage = z.enum(["en", "es"]).optional().or(z.literal(""));

export const companyOwnerFormSchema = z.object({
  clientId: optionalString,
  name: z.string().trim().min(1, "Name is required"),
  role: optionalString,
  ownershipPercentage: optionalString,
  phone: optionalString,
  email: optionalString,
  preferredLanguage: optionalLanguage,
  authorizedSigner: z.boolean().optional(),
  startDate: optionalString,
  endDate: optionalString,
  notes: optionalString,
});
export type CompanyOwnerFormValues = z.infer<typeof companyOwnerFormSchema>;

export const companyContactFormSchema = z.object({
  clientId: optionalString,
  name: z.string().trim().min(1, "Name is required"),
  role: optionalString,
  phone: optionalString,
  email: optionalString,
  notes: optionalString,
});
export type CompanyContactFormValues = z.infer<typeof companyContactFormSchema>;

export const companyAuthorizedRepresentativeFormSchema = z.object({
  clientId: optionalString,
  name: z.string().trim().min(1, "Name is required"),
  role: optionalString,
  phone: optionalString,
  email: optionalString,
  notes: optionalString,
});
export type CompanyAuthorizedRepresentativeFormValues = z.infer<
  typeof companyAuthorizedRepresentativeFormSchema
>;
