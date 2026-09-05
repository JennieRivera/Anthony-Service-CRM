import { z } from "zod";

export const latinoOpportunityScoreValues = [
  "very_high",
  "high",
  "medium",
  "emerging",
  "insufficient_data",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const latinoBusinessDataFormSchema = z.object({
  estimatedLatinoPopulation: optionalString,
  estimatedLatinoBusinessPresence: optionalString,
  topIndustries: optionalString,
  amsClientsCount: optionalString,
  amsLeadsCount: optionalString,
  revenueFromState: optionalString,
  opportunityScore: z.enum(latinoOpportunityScoreValues),
  potentialServices: optionalString,
  expansionNotes: optionalString,
  notes: optionalString,
  sourceName: optionalString,
  sourceUrl: optionalString,
  sourceYear: optionalString,
  sourceLastUpdated: optionalString,
  sourceDataType: optionalString,
  verifiedBy: optionalString,
});
export type LatinoBusinessDataFormValues = z.infer<
  typeof latinoBusinessDataFormSchema
>;
