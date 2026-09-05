// Fixed 10-folder taxonomy for documents on an Immigration Administrative
// Services case (Phase 5, Session 6, spec section 6). Order matches the
// numbered list in the spec and drives display order in the UI.
export const immigrationDocumentFolderValues = [
  "intake",
  "identity_documents",
  "client_provided_information",
  "government_forms",
  "supporting_documents",
  "translation",
  "signatures",
  "filing_confirmation",
  "government_notices",
  "final_documents",
] as const;

export type ImmigrationDocumentFolder =
  (typeof immigrationDocumentFolderValues)[number];
