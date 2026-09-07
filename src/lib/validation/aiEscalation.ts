import { z } from "zod";

export const aiEscalationRiskLevelValues = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const aiEscalationStatusValues = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const aiEscalationFormSchema = z.object({
  agentId: z.string().min(1, "Agent is required"),
  clientId: z.string().min(1, "Client is required"),
  caseId: optionalString,
  reason: z.string().trim().min(1, "Reason is required"),
  riskLevel: z.enum(aiEscalationRiskLevelValues),
});

export type AiEscalationFormValues = z.infer<typeof aiEscalationFormSchema>;

export const aiEscalationResolutionFormSchema = z.object({
  status: z.enum(aiEscalationStatusValues),
  assignedHumanEmail: optionalString,
  resolution: optionalString,
  resolutionDate: optionalString,
});

export type AiEscalationResolutionFormValues = z.infer<
  typeof aiEscalationResolutionFormSchema
>;
