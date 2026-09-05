import { z } from "zod";

export const associationOrganizationTypeValues = [
  "latino_chamber",
  "chamber_of_commerce",
  "business_association",
  "professional_association",
  "community_organization",
  "faith_based_organization",
  "other",
] as const;

export const associationRelationshipStatusValues = [
  "research",
  "prospect",
  "contacted",
  "meeting_scheduled",
  "member",
  "strategic_partner",
  "inactive",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const associationChamberFormSchema = z.object({
  organizationName: z.string().trim().min(1, "Organization name is required"),
  organizationType: z.enum(associationOrganizationTypeValues),
  state: optionalString,
  city: optionalString,
  country: optionalString,
  website: optionalString,
  phone: optionalString,
  email: optionalString,
  contactPerson: optionalString,
  industryFocus: optionalString,
  latinoFocus: z.boolean().optional(),
  membershipStatus: optionalString,
  membershipCost: optionalString,
  amsRelationshipStatus: z.enum(associationRelationshipStatusValues),
  dateContacted: optionalString,
  lastContact: optionalString,
  nextFollowUp: optionalString,
  partnershipOpportunity: optionalString,
  notes: optionalString,
});
export type AssociationChamberFormValues = z.infer<
  typeof associationChamberFormSchema
>;
