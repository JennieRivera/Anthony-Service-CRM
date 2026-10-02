import { z } from "zod";

const optionalString = z.string().trim().optional().or(z.literal(""));

// Network provenance only — see the comment on allianceNetworkRelationships
// in schema.ts. No amount/percentage/payment field exists here on purpose.
export const allianceNetworkFormSchema = z
  .object({
    introducedAllianceId: z.string().trim().min(1, "Select the introduced alliance"),
    relationshipDate: optionalString,
    notes: optionalString,
  })
  .refine((values) => values.introducedAllianceId, {
    message: "Select the introduced alliance",
    path: ["introducedAllianceId"],
  });

export type AllianceNetworkFormValues = z.infer<typeof allianceNetworkFormSchema>;
