// The seven boxes on the portal's "My authorizations" page, in display
// order — pure constants, safe to import from client components. The five
// channel ones ARE the CRM's Communication Preferences switches (one source
// of truth); document_processing and privacy_notice live only in the
// consent events. See src/lib/portal/account.ts.
export const PORTAL_AUTHORIZATIONS = [
  "phone_calls",
  "whatsapp",
  "sms",
  "email",
  "marketing",
  "document_processing",
  "privacy_notice",
] as const;
export type PortalAuthorization = (typeof PORTAL_AUTHORIZATIONS)[number];
