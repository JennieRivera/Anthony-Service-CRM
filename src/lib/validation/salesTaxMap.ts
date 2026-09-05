import { z } from "zod";

const optionalString = z.string().trim().optional().or(z.literal(""));

export const salesTaxStateInfoFormSchema = z.object({
  stateTaxAgency: optionalString,
  officialWebsite: optionalString,
  registrationLink: optionalString,
  filingPortalLink: optionalString,
  businessRegistrationLink: optionalString,
  notes: optionalString,
  lastVerifiedDate: optionalString,
});
export type SalesTaxStateInfoFormValues = z.infer<
  typeof salesTaxStateInfoFormSchema
>;
