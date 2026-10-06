import { createHmac, randomBytes } from "node:crypto";
import { safeEqual, sanitizeUploadFileName } from "@/lib/portal/tokens";

// Partner-portal crypto helpers. Token generation/hashing is shared with
// the client portal (src/lib/portal/tokens.ts); every HMAC here uses its
// own "partner-…" namespace, so nothing signed for a client can ever be
// replayed as a partner (or the other way around).
export {
  generatePortalToken as generatePartnerToken,
  hashPortalToken as hashPartnerToken,
  isWellFormedPortalToken as isWellFormedPartnerToken,
  lastFourDigits,
  safeEqual,
} from "@/lib/portal/tokens";

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured");
  return value;
}

const hmac = (input: string) => createHmac("sha256", secret()).update(input).digest("hex");

export function partnerIpKey(ip: string): string {
  return hmac(`partner-ip:${ip}`);
}

export function partnerLast4Hash(allianceId: string, lastFour: string): string {
  return hmac(`partner-last4:${allianceId}:${lastFour}`);
}

// Upload pathnames: partner-uploads/<kind>/<nonce>.<mac>/<file>, the MAC
// bound to the alliance AND the kind, so /complete can trust neither the
// browser's alliance nor its claimed purpose.
export const PARTNER_UPLOAD_KINDS = ["document", "marketing", "logo", "photo", "contact_document"] as const;
export type PartnerUploadKind = (typeof PARTNER_UPLOAD_KINDS)[number];
const PREFIX = "partner-uploads/";

const uploadMac = (allianceId: string, kind: string, nonce: string) =>
  hmac(`partner-upload:${allianceId}:${kind}:${nonce}`).slice(0, 32);

export function createPartnerUploadPathname(allianceId: string, kind: PartnerUploadKind, fileName: string): string {
  const nonce = randomBytes(12).toString("hex");
  return `${PREFIX}${kind}/${nonce}.${uploadMac(allianceId, kind, nonce)}/${sanitizeUploadFileName(fileName)}`;
}

export function partnerUploadKindFor(pathname: string, allianceId: string): PartnerUploadKind | null {
  if (!pathname.startsWith(PREFIX)) return null;
  const parts = pathname.slice(PREFIX.length).split("/");
  if (parts.length !== 3) return null;
  const [kind, dir] = parts;
  if (!(PARTNER_UPLOAD_KINDS as readonly string[]).includes(kind)) return null;
  const match = dir.match(/^([0-9a-f]{24})\.([0-9a-f]{32})$/);
  if (!match) return null;
  return safeEqual(match[2], uploadMac(allianceId, kind, match[1])) ? (kind as PartnerUploadKind) : null;
}
