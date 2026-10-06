// Exports never carry SSN/ITIN, A-numbers, immigration receipt numbers, or
// full card/account numbers. Structured columns that could hold them are
// simply left out of every export (see lists.ts / records.ts); this masks
// the same patterns inside free text (notes, summaries, titles) where staff
// might have typed one anyway.

// NNN-NN-NNNN / NNN NN NNNN / NNNNNNNNN (exactly 9 digits, so a 10-digit
// phone number is not touched).
const SSN_ITIN = /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/g;
// A-number: "A" + 8 or 9 digits, optionally grouped (A123456789, A-123-456-789).
const A_NUMBER = /\bA[- ]?\d{2,3}[- ]?\d{3}[- ]?\d{3}\b/gi;
// USCIS receipt numbers: 3 letters + 10 digits (e.g. IOE0912345678, MSC…).
const RECEIPT_NUMBER = /\b[A-Z]{3}\d{10}\b/g;
// Card / bank account numbers: 10–19 digits, optionally grouped by spaces
// or dashes. Keeps the last 4. Phone numbers written as (407) 555-0108 or
// 407-555-0108 are 10 digits in 3-3-4 groups and are left alone below.
const LONG_NUMBER = /\b(?:\d[ -]?){10,19}\b/g;
const PHONE_LIKE = /^\(?\d{3}\)?[ -]?\d{3}[ -]?\d{4}$/;

export function maskSensitive(value: string): string {
  return value
    .replace(A_NUMBER, "A-•••••••••")
    .replace(RECEIPT_NUMBER, "•••••••••••••")
    .replace(LONG_NUMBER, (match) => {
      const trimmed = match.trim();
      if (PHONE_LIKE.test(trimmed)) return match;
      const digits = trimmed.replace(/\D/g, "");
      return `${"•".repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}${match.endsWith(" ") ? " " : ""}`;
    })
    .replace(SSN_ITIN, "•••-••-••••");
}
