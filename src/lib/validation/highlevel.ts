import { z } from "zod";

export const integrationSyncStatusValues = [
  "not_connected",
  "ready",
  "connected",
  "syncing",
  "error",
  "paused",
] as const;

export const highlevelSyncDirectionValues = [
  "crm_to_highlevel",
  "highlevel_to_crm",
  "two_way",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const highlevelSyncFormSchema = z.object({
  highlevelContactId: optionalString,
  highlevelOpportunityId: optionalString,
  highlevelLocationId: optionalString,
  highlevelTag: optionalString,
  highlevelPipeline: optionalString,
  syncStatus: z.enum(integrationSyncStatusValues),
  syncDirection: z.enum(highlevelSyncDirectionValues).optional().or(z.literal("")),
});

export type HighlevelSyncFormValues = z.infer<typeof highlevelSyncFormSchema>;
