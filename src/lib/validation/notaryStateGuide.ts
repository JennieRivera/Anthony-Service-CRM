import { z } from "zod";

const optionalString = z.string().trim().optional().or(z.literal(""));

export const notaryStateGuideStatusValues = [
  "verified",
  "needs_review",
  "unavailable",
] as const;

export const notaryStateGuideFormSchema = z.object({
  officialAgency: optionalString,
  officialWebsite: optionalString,
  commissionLink: optionalString,
  examLink: optionalString,
  requirementsLink: optionalString,
  sourceUrl: optionalString,
  status: z.enum(notaryStateGuideStatusValues),
});
export type NotaryStateGuideFormValues = z.infer<
  typeof notaryStateGuideFormSchema
>;
