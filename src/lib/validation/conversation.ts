import { z } from "zod";

export const conversationChannelValues = ["email", "call", "whatsapp"] as const;
export const conversationDirectionValues = ["inbound", "outbound"] as const;

// Manual logging only supports email and call for now — whatsapp entries
// will be created by the Meta webhook once that integration is connected.
export const loggableConversationChannelValues = ["email", "call"] as const;

export const conversationMessageFormSchema = z.object({
  clientId: z.string().min(1),
  caseId: z.string().optional().or(z.literal("")),
  channel: z.enum(loggableConversationChannelValues),
  direction: z.enum(conversationDirectionValues),
  occurredAt: z.string().min(1, "Date is required"),
  subject: z.string().trim().optional().or(z.literal("")),
  summary: z.string().trim().min(1, "Summary is required"),
  durationMinutes: z.string().optional().or(z.literal("")),
  counterpart: z.string().trim().optional().or(z.literal("")),
});

export type ConversationMessageFormValues = z.infer<
  typeof conversationMessageFormSchema
>;
