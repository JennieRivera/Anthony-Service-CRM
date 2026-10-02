// AI Foundation / Security phase — the masking half of the sensitive-data
// story. src/lib/sensitiveDataCheck.ts already *detects* SSN/ITIN/card/
// password patterns for human-facing warnings on escalation/knowledge-base
// forms; this file *masks* values before they could ever reach a future AI
// executor or an audit-log row, and documents exactly which field
// categories are protected so that list doesn't just live in someone's
// memory. Nothing here calls an LLM or reads from the database — these are
// pure string helpers a future executor MUST pass data through.

// The fixed category list PHASE6-PLAN.md section 17 and this phase's spec
// both name. A future executor's data-access path is expected to mask or
// deny every one of these before any value crosses into an AI-facing
// context (a prompt, a tool-call argument, or an audit-log row).
export const PROTECTED_FIELD_CATEGORIES = [
  "ssn",
  "itin",
  "bank_account_number",
  "routing_number",
  "payment_credentials",
  "full_tax_records",
  "authentication_secrets",
  "api_keys",
  "private_system_credentials",
] as const;

export type ProtectedFieldCategory = (typeof PROTECTED_FIELD_CATEGORIES)[number];

// Which real schema.ts columns/areas fall into each category — descriptive
// documentation, not an enforcement mechanism by itself. A future masking
// call site should name the category it's protecting so this list stays
// the single source of truth for "what counts as sensitive" instead of
// each call site re-deciding.
export const PROTECTED_FIELD_NOTES: Record<ProtectedFieldCategory, string> = {
  ssn: "Client SSN fields (where captured in intake/tax details) — never unmasked to an agent.",
  itin: "Client ITIN fields (tax_service_details, immigration intake) — never unmasked to an agent.",
  bank_account_number: "Any stored bank account number (payments, bookkeeping details) — never unmasked to an agent.",
  routing_number: "Any stored bank routing number — never unmasked to an agent.",
  payment_credentials: "Stripe keys, card numbers, payment tokens — never exposed to an agent in any form, masked or not.",
  full_tax_records: "Full tax_service_details / irs_case_details rows — an agent may see status/document-checklist fields only, never full return contents.",
  authentication_secrets: "AUTH_SECRET, password hashes (users.passwordHash) — never readable by any agent code path.",
  api_keys: "Any *_API_KEY / *_TOKEN / *_SECRET environment variable — never readable by any agent code path.",
  private_system_credentials: "DATABASE_URL, CRON_SECRET, BLOB tokens, and anything else in process.env not covering an AI provider — never readable by any agent code path.",
};

// --- Masking helpers -------------------------------------------------------
// Each returns a display-safe stand-in, never the real value, never a
// partial value longer than a short trailing fragment useful for a human to
// recognize "yes that's the right record" without exposing the secret.

// value is kept in every masker's signature so callers have one uniform
// "pass what you have" API, even where (as here) the category never
// partially reveals anything.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function maskSsn(value: string | null | undefined): string {
  return "***-**-****";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- see maskSsn
export function maskItin(value: string | null | undefined): string {
  return "9**-**-****";
}

export function maskBankAccountNumber(value: string | null | undefined): string {
  if (!value) return "****";
  const digits = value.replace(/\D/g, "");
  const lastFour = digits.slice(-4);
  return lastFour ? `****${lastFour}` : "****";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- see maskSsn
export function maskRoutingNumber(value: string | null | undefined): string {
  return "*********";
}

export function maskCardNumber(value: string | null | undefined): string {
  if (!value) return "**** **** **** ****";
  const digits = value.replace(/\D/g, "");
  const lastFour = digits.slice(-4);
  return lastFour ? `**** **** **** ${lastFour}` : "**** **** **** ****";
}

// For API keys / tokens / passwords / anything else that must never be
// partially shown at all — unlike the financial maskers above, there is no
// "last 4 digits" convention safe enough for a credential.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- see maskSsn
export function maskSecret(value: string | null | undefined): string {
  return "[REDACTED]";
}

// Strips anything that looks like a secret out of free text before it's
// ever written to a log row or (in the future) handed to an executor —
// belt-and-suspenders alongside the category-based maskers above, for
// values that arrive as unstructured text (e.g. an escalation's "reason").
const SECRET_LOOKING_PATTERN =
  /\b(?:sk-|pk_live_|pk_test_|sk_live_|sk_test_|AIza|ghp_|xox[abp]-)[A-Za-z0-9_-]{8,}\b/g;

export function redactSecretLookingText(text: string): string {
  return text.replace(SECRET_LOOKING_PATTERN, "[REDACTED]");
}

// Single entry point an audit-log writer or future executor calls before
// persisting/forwarding any free-text field it didn't generate itself
// (actionDetail, previousValue, newValue, an escalation reason, etc.).
// Never throws — always returns a safe-to-store string.
export function sanitizeForAiVisibility(text: string | null | undefined): string | null {
  if (text == null) return null;
  return redactSecretLookingText(text);
}
