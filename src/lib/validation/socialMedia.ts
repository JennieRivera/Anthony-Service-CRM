import { z } from "zod";
import { serviceTypeValues } from "./client";

export const socialMediaPlatformValues = [
  "facebook",
  "instagram",
  "youtube",
  "tiktok",
  "linkedin",
  "website",
  "google_business_profile",
  "whatsapp_channel",
  "other",
] as const;

export const socialContentTypeValues = [
  "image",
  "video",
  "reel",
  "short",
  "story",
  "carousel",
  "live",
  "educational_post",
  "promotion",
  "testimonial",
  "event",
  "blog",
  "other",
] as const;

export const socialContentStatusValues = [
  "idea",
  "draft",
  "in_review",
  "approved",
  "scheduled",
  "published",
  "archived",
] as const;

export const socialPerformanceStatusValues = [
  "not_tracked",
  "tracking",
  "final",
] as const;

export const socialPartnerApprovalStatusValues = [
  "not_required",
  "pending",
  "approved",
  "denied",
] as const;

export const socialContentLanguageValues = ["en", "es"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

// Section 7 — "Do not publish partner names, logos, services, or claims
// without approval where required." Enforced here, not just documented:
// status can't reach "published" while an approval it needs is missing.
export const socialMediaContentFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    platform: z.enum(socialMediaPlatformValues),
    contentType: z.enum(socialContentTypeValues),
    campaign: optionalString,
    brand: optionalString,
    serviceType: z.enum(serviceTypeValues).optional().or(z.literal("")),
    audience: optionalString,
    language: z.enum(socialContentLanguageValues).optional().or(z.literal("")),
    caption: optionalString,
    hashtags: optionalString,
    callToAction: optionalString,
    mediaAssetId: optionalString,
    status: z.enum(socialContentStatusValues),
    scheduledDate: optionalString,
    publishedDate: optionalString,
    postUrl: optionalString,
    performanceStatus: z.enum(socialPerformanceStatusValues),
    approvalRequired: z.boolean().optional(),
    approvedBy: optionalString,
    approvalDate: optionalString,
    partnerApprovalRequired: z.boolean().optional(),
    partnerApprovalStatus: z.enum(socialPartnerApprovalStatusValues),
    notes: optionalString,
  })
  .refine(
    (data) =>
      data.status !== "published" ||
      !data.approvalRequired ||
      Boolean(data.approvedBy?.trim() && data.approvalDate),
    {
      message:
        "This content requires approval before it can be published — set Approved By and Approval Date first.",
      path: ["status"],
    },
  )
  .refine(
    (data) =>
      data.status !== "published" ||
      !data.partnerApprovalRequired ||
      data.partnerApprovalStatus === "approved",
    {
      message:
        "This content requires partner approval before it can be published.",
      path: ["status"],
    },
  );

export type SocialMediaContentFormValues = z.infer<
  typeof socialMediaContentFormSchema
>;
