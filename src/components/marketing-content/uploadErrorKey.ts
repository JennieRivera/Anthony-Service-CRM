export function marketingUploadErrorKey(
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
