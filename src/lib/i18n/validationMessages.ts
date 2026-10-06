// Form validation messages are written in English inside the Zod schemas
// (src/lib/validation/*.ts) — the same schema runs on the server — and
// translated only when shown. Each message's key in messages →
// ValidationMessages is its English text turned into a slug, e.g.
// "Title is required" → "title_is_required". validationMessages.test.ts
// fails if a schema message has no translation.

export function validationMessageKey(message: string): string {
  return message
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

// Zod's own built-in messages (no custom text in the schema), e.g.
// "Invalid input: expected string, received undefined" or "Invalid
// option: …" — shown as a plain "check this field".
export const GENERIC_VALIDATION_KEY = "check_this_field";

export function isZodDefaultMessage(message: string): boolean {
  return /^(Invalid|Too (small|big)|Expected|Required$)/.test(message) && !/ is required$/.test(message);
}
