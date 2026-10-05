// Client portal uploads — detects a file's REAL type from its leading bytes
// ("magic numbers"), and requires it to agree with the file's extension.
// A renamed .exe, an HTML page called "w2.pdf", or a PDF called "id.jpg"
// are all rejected. Pure function, unit-tested in fileTypes.test.ts.

export type PortalFileKind = "pdf" | "jpeg" | "png" | "webp" | "heic" | "docx" | "doc";

export const PORTAL_FILE_CONTENT_TYPES: Record<PortalFileKind, string> = {
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
};

const EXTENSION_KIND: Record<string, PortalFileKind> = {
  ".pdf": "pdf",
  ".jpg": "jpeg",
  ".jpeg": "jpeg",
  ".png": "png",
  ".webp": "webp",
  ".heic": "heic",
  ".heif": "heic",
  ".docx": "docx",
  ".doc": "doc",
};

// What the browser may declare when asking for an upload token (some
// browsers report HEIC/Word files with an empty or generic type, so the
// upload form sends the type derived from the extension instead).
export const PORTAL_ALLOWED_UPLOAD_CONTENT_TYPES = [
  ...new Set(Object.values(PORTAL_FILE_CONTENT_TYPES)),
  "image/heif",
];

// For <input accept="…">.
export const PORTAL_UPLOAD_ACCEPT = Object.keys(EXTENSION_KIND).join(",");

export function portalKindForFileName(fileName: string): PortalFileKind | null {
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? (EXTENSION_KIND[lower.slice(dot)] ?? null) : null;
}

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((b, i) => bytes[offset + i] === b);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, Math.min(end, bytes.length)));
}

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

export function detectPortalFileKind(bytes: Uint8Array): PortalFileKind | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf"; // %PDF-
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "webp";
  if (ascii(bytes, 4, 8) === "ftyp" && HEIF_BRANDS.has(ascii(bytes, 8, 12))) return "heic";
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "doc"; // OLE2
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    // A ZIP — only a Word document if it carries Word's own parts.
    const head = ascii(bytes, 0, 64 * 1024);
    if (head.includes("word/") || head.includes("[Content_Types].xml")) return "docx";
  }
  return null;
}

// The detected type must exist AND match the extension's type.
export function validatePortalFile(
  fileName: string,
  bytes: Uint8Array,
): { ok: true; kind: PortalFileKind; contentType: string } | { ok: false } {
  const expected = portalKindForFileName(fileName);
  const actual = detectPortalFileKind(bytes);
  if (!expected || !actual || expected !== actual) return { ok: false };
  return { ok: true, kind: actual, contentType: PORTAL_FILE_CONTENT_TYPES[actual] };
}
