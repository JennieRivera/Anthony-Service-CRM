import { z } from "zod";

export const organizationTypeValues = [
  "church",
  "chamber_of_commerce",
  "cpa_accountant",
  "attorney",
  "insurance",
  "realtor",
  "consultant",
  "financial_partner",
  "technology_partner",
  "community_organization",
  "professional_association",
  "other",
] as const;

export const allianceStatusValues = [
  "prospect",
  "contacted",
  "meeting_scheduled",
  "under_discussion",
  "agreement_review",
  "active_partner",
  "paused",
  "inactive",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const allianceFormSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required"),
  contactPerson: optionalString,
  organizationType: z
    .enum(organizationTypeValues)
    .optional()
    .or(z.literal("")),
  phone: optionalString,
  email: optionalString,
  website: optionalString,
  state: optionalString,
  country: optionalString,
  relationshipOwner: optionalString,
  dateIntroduced: optionalString,
  servicesConnected: optionalString,
  referralAgreement: z.boolean().optional(),
  commissionAgreement: z.boolean().optional(),
  marketingPermission: z.boolean().optional(),
  logoPermission: z.boolean().optional(),
  lastContact: optionalString,
  nextFollowUp: optionalString,
  status: z.enum(allianceStatusValues),
  notes: optionalString,
});

export type AllianceFormValues = z.infer<typeof allianceFormSchema>;
