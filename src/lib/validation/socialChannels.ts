import { z } from "zod";

export const metaChannelStatusValues = [
  "not_connected",
  "connected",
  "consent_pending",
  "active",
  "opted_out",
] as const;

export const websiteSourceValues = [
  "anthonyservice_com",
  "anthonyfinancial360_com",
  "anthonymultiservice_net",
  "anthonymultiserviceacademy_ai",
  "other",
] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

export const facebookThreadFormSchema = z.object({
  clientId: optionalString,
  caseId: optionalString,
  facebookProfile: z.string().trim().min(1, "Facebook profile/page is required"),
  status: z.enum(metaChannelStatusValues),
  followUpDate: optionalString,
});
export type FacebookThreadFormValues = z.infer<typeof facebookThreadFormSchema>;

export const instagramThreadFormSchema = z.object({
  clientId: optionalString,
  caseId: optionalString,
  instagramUsername: z.string().trim().min(1, "Instagram username is required"),
  status: z.enum(metaChannelStatusValues),
  followUpDate: optionalString,
});
export type InstagramThreadFormValues = z.infer<typeof instagramThreadFormSchema>;

export const websiteChatSessionFormSchema = z.object({
  clientId: optionalString,
  websiteSource: z.enum(websiteSourceValues),
  visitorName: optionalString,
  visitorEmail: optionalString,
  visitorPhone: optionalString,
  language: z.enum(["en", "es"]).optional().or(z.literal("")),
  serviceInterest: optionalString,
  message: z.string().trim().min(1, "Message is required"),
  conversationStatus: z.enum([
    "new",
    "read",
    "replied",
    "pending_follow_up",
    "completed",
    "archived",
  ]),
  followUpDate: optionalString,
});
export type WebsiteChatSessionFormValues = z.infer<
  typeof websiteChatSessionFormSchema
>;
