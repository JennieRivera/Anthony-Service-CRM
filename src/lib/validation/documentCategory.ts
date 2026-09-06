// General, business-wide document folders for the Documents module.
// "immigration" is set automatically whenever a document also gets a fine
// immigration sub-folder (see immigrationDocumentFolder.ts) — it's listed
// here so it can be displayed/filtered like any other folder, but the
// upload UI never offers it as a manual choice.
export const documentCategoryValues = [
  "identification",
  "proof_of_address",
  "signed_forms",
  "contracts",
  "payment_receipts",
  "government_correspondence",
  "tax_documents",
  "financial_documents",
  "notarized_documents",
  "immigration",
  "other",
] as const;

export type DocumentCategory = (typeof documentCategoryValues)[number];

// Categories a person can pick from a general upload dialog — everything
// except "immigration", which is derived, never chosen.
export const selectableDocumentCategoryValues = documentCategoryValues.filter(
  (value) => value !== "immigration",
);
