import { detectPortalFileKind } from "./fileTypes";

// Profile photo rules (Step 2B), shared by the browser and the server.
// The client picks a JPG/PNG/WEBP of up to 5 MB; the browser crops it to a
// square and re-encodes it at PROFILE_PHOTO_SIZE px (which also drops the
// photo's EXIF data, GPS location included) before uploading, so what the
// server receives is small. The server re-checks the real bytes.

export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_PHOTO_SIZE = 512;
export const PROFILE_PHOTO_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export function isAllowedProfilePhotoName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function detectProfilePhotoKind(
  bytes: Uint8Array,
): { contentType: string; extension: string } | null {
  switch (detectPortalFileKind(bytes)) {
    case "jpeg":
      return { contentType: "image/jpeg", extension: "jpg" };
    case "png":
      return { contentType: "image/png", extension: "png" };
    case "webp":
      return { contentType: "image/webp", extension: "webp" };
    default:
      return null;
  }
}
