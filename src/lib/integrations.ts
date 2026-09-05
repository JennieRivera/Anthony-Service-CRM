// Phase 4, Session 5 — static catalog of every integration named in the
// Phase 4 plan's "Future Integration Architecture" section. Purely
// descriptive metadata (name, category, connection type, which env var it
// would need); the mutable/dynamic half of each row (status, last sync,
// notes...) lives in integration_settings, upserted lazily on first edit.
// envVarName is checked for *presence only* by the Test Connection action —
// its value is never read into the UI or logged.
export type IntegrationConnectionType =
  | "api"
  | "webhook"
  | "oauth"
  | "smtp"
  | "external_link"
  | "manual"
  | "unknown";

export type IntegrationDefinition = {
  key: string;
  category: "communications" | "productivity" | "professional_systems";
  connectionType: IntegrationConnectionType;
  envVarName?: string;
};

export const INTEGRATION_DEFINITIONS: IntegrationDefinition[] = [
  { key: "highlevel", category: "communications", connectionType: "api", envVarName: "HIGHLEVEL_API_KEY" },
  { key: "whatsapp", category: "communications", connectionType: "api", envVarName: "WHATSAPP_API_KEY" },
  { key: "meta_facebook", category: "communications", connectionType: "api", envVarName: "META_FACEBOOK_TOKEN" },
  { key: "meta_instagram", category: "communications", connectionType: "api", envVarName: "META_INSTAGRAM_TOKEN" },
  { key: "email_provider", category: "communications", connectionType: "smtp", envVarName: "EMAIL_PROVIDER_API_KEY" },
  { key: "sms_provider", category: "communications", connectionType: "api", envVarName: "SMS_PROVIDER_API_KEY" },
  { key: "google_drive", category: "productivity", connectionType: "oauth", envVarName: "GOOGLE_DRIVE_CLIENT_ID" },
  { key: "quickbooks", category: "productivity", connectionType: "oauth", envVarName: "QUICKBOOKS_CLIENT_ID" },
  { key: "tax_software", category: "professional_systems", connectionType: "unknown", envVarName: "TAX_SOFTWARE_API_KEY" },
  { key: "bookkeeping_software", category: "professional_systems", connectionType: "unknown", envVarName: "BOOKKEEPING_SOFTWARE_API_KEY" },
  { key: "consulting_software", category: "professional_systems", connectionType: "unknown", envVarName: "CONSULTING_SOFTWARE_API_KEY" },
  { key: "startpoint", category: "professional_systems", connectionType: "external_link" },
  { key: "rri_referral_portal", category: "professional_systems", connectionType: "manual" },
];

export function getIntegrationDefinition(key: string) {
  return INTEGRATION_DEFINITIONS.find((d) => d.key === key) ?? null;
}
