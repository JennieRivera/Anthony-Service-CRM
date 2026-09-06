import { findSensitiveDataReason, type SensitiveDataReason } from "@/lib/sensitiveDataCheck";

// The formats staff actually use day to day (spec: "PDF, imagen, Word,
// Excel"). Kept as an allow-list rather than a block-list — documents are
// served back from Blob storage as public URLs, so an unrestricted upload
// (e.g. .html/.svg) could otherwise be opened directly as active content.
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
];

export function isAllowedDocumentFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

// Text-extractable content check is only reliable for PDFs today (see
// [[scanFileForSensitiveData]] doc comment below) — everything else falls
// back to a filename-only check.
async function extractPdfText(file: File): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const buffer = new Uint8Array(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}

/**
 * Blocks uploads that plainly contain an SSN/ITIN, a credit card number, or
 * a password. Filenames are always checked. For PDFs (the common case for
 * scanned/exported documents in this business) the real extracted text is
 * also checked. Word/Excel/image content cannot be scanned this way without
 * much heavier tooling (an Office-document parser, OCR) — that gap is a
 * known, explicit limitation, not an oversight.
 */
export async function scanFileForSensitiveData(
  file: File,
): Promise<SensitiveDataReason | null> {
  const fileNameReason = findSensitiveDataReason(file.name);
  if (fileNameReason) return fileNameReason;

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    try {
      const text = await extractPdfText(file);
      return findSensitiveDataReason(text);
    } catch {
      // An unreadable/corrupt PDF isn't a reason to block the upload —
      // just skip the content check for it.
      return null;
    }
  }

  return null;
}
