import { z } from "zod";

export const websiteLinkStatusValues = ["active", "inactive", "unknown"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const websiteLinkFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  url: z.string().trim().min(1, "URL is required"),
  status: z.enum(websiteLinkStatusValues),
  notes: optionalString,
  active: z.boolean().optional(),
});

export type WebsiteLinkFormValues = z.infer<typeof websiteLinkFormSchema>;
