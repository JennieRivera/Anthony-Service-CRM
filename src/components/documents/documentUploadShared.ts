export const DOCUMENT_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/heic,.doc,.docx,.xls,.xlsx";

export function uploadErrorKey(
  body: { code?: string; reason?: string } | null,
): string {
  if (body?.code === "unsupported_type") return "uploadErrorUnsupportedType";
  if (body?.code === "sensitive_data") {
    if (body.reason === "ssn_itin") return "uploadErrorSensitiveSsn";
    if (body.reason === "credit_card") return "uploadErrorSensitiveCard";
    if (body.reason === "password") return "uploadErrorSensitivePassword";
  }
  return "uploadError";
}
