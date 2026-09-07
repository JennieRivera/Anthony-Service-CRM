export const marketingChannelValues = [
  "facebook",
  "instagram",
  "tiktok",
  "email",
  "whatsapp",
  "other",
] as const;

export type MarketingChannel = (typeof marketingChannelValues)[number];

// Images and video only — this library is for social/marketing assets, not
// documents, so it doesn't need the PDF/Word/Excel formats the Documents
// module allows.
const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".gif",
  ".mp4",
  ".mov",
  ".webm",
];

export function isAllowedMarketingContentFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export const MARKETING_CONTENT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/gif,video/mp4,video/quicktime,video/webm";
