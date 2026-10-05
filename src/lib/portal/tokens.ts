import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Pure crypto helpers for the client portal — no database, no Next.js.

// 32 random bytes → 43-char base64url token. Only its SHA-256 is stored.
export function generatePortalToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPortalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Tokens are always exactly 43 base64url characters; anything else is
// rejected before touching the database.
export function isWellFormedPortalToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not configured");
  return value;
}

export function portalIpKey(ip: string): string {
  return createHmac("sha256", secret()).update(`portal-ip:${ip}`).digest("hex");
}

export function lastFourDigits(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Upload pathnames carry a nonce + an HMAC bound to the client, so the
// "complete upload" step can prove the blob was uploaded under THIS
// session's client without trusting anything the browser sends, and
// without ever exposing the client's id:
//   portal-uploads/<nonce>.<mac>/<sanitized file name>
const UPLOAD_PREFIX = "portal-uploads/";

function uploadMac(clientId: string, nonce: string): string {
  return createHmac("sha256", secret())
    .update(`portal-upload:${clientId}:${nonce}`)
    .digest("hex")
    .slice(0, 32);
}

export function sanitizeUploadFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/^\.+/, "")
    .slice(-120);
  return cleaned || "file";
}

export function createUploadPathname(clientId: string, fileName: string): string {
  const nonce = randomBytes(12).toString("hex");
  return `${UPLOAD_PREFIX}${nonce}.${uploadMac(clientId, nonce)}/${sanitizeUploadFileName(fileName)}`;
}

// True only if the pathname was issued by createUploadPathname for this
// exact client. Vercel Blob may append a random suffix to the file name,
// which doesn't affect the signed directory part.
export function isUploadPathnameForClient(pathname: string, clientId: string): boolean {
  if (!pathname.startsWith(UPLOAD_PREFIX)) return false;
  const dir = pathname.slice(UPLOAD_PREFIX.length).split("/")[0] ?? "";
  const match = dir.match(/^([0-9a-f]{24})\.([0-9a-f]{32})$/);
  if (!match) return false;
  if (pathname.split("/").length !== 3) return false;
  return safeEqual(match[2], uploadMac(clientId, match[1]));
}
