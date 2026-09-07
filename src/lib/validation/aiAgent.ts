import { z } from "zod";

export const aiAgentDepartmentValues = [
  "client_service",
  "tax_bookkeeping",
  "commercial_finance",
  "immigration",
  "document_services",
  "business_consulting",
  "community_academy",
  "operations",
] as const;

export const aiAgentLanguageValues = ["en", "es", "bilingual"] as const;

export const aiAgentAvatarStyleValues = ["human", "robot"] as const;

export const aiKnowledgeBaseSectionValues = [
  "approved_services",
  "approved_scripts",
  "faqs",
  "policies",
  "disclaimers",
  "checklists",
  "workflows",
  "forms",
  "official_resources",
  "escalation_rules",
  "prohibited_actions",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const aiAgentProfileFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  title: z.string().trim().min(1, "Title is required"),
  department: z.enum(aiAgentDepartmentValues),
  language: z.enum(aiAgentLanguageValues),
  avatarStyle: z.enum(aiAgentAvatarStyleValues),
  accentColor: optionalString,
  bio: optionalString,
  welcomeMessage: optionalString,
  disclaimerText: optionalString,
  canRead: z.boolean(),
  canWrite: z.boolean(),
  canCreateTask: z.boolean(),
  canCreateNote: z.boolean(),
  canChangeStatus: z.boolean(),
  canSendDraft: z.boolean(),
  canSendMessage: z.boolean(),
  canEscalate: z.boolean(),
});

export type AiAgentProfileFormValues = z.infer<typeof aiAgentProfileFormSchema>;

export const aiAgentKnowledgeBaseFormSchema = z.object({
  section: z.enum(aiKnowledgeBaseSectionValues),
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().min(1, "Content is required"),
});

export type AiAgentKnowledgeBaseFormValues = z.infer<
  typeof aiAgentKnowledgeBaseFormSchema
>;

// Filenames only — image bytes can't be scanned for sensitive data, same
// reasoning applied to marketing-content uploads.
export function isAllowedAvatarFile(fileName: string) {
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(fileName);
}

export const MAX_AVATAR_FILE_SIZE_BYTES = 5 * 1024 * 1024;
