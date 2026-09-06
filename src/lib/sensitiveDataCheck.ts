// Phase 4, Session 7 — "No storing SSN or ITIN in communication fields"
// (spec #19). This is a soft, client-side warning shown while typing, not a
// hard block: a 9-digit run in NNN-NN-NNNN form is a strong SSN/ITIN
// signal, but false positives exist (e.g. a reference number), and this
// business's own compliance need is to stay alert, not to silently reject
// a legitimate note. Nothing here reads, stores, or transmits the matched
// text anywhere — it only flips a boolean for the form to display.
const SSN_ITIN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/;

export function containsLikelySsnOrItin(text: string): boolean {
  return SSN_ITIN_PATTERN.test(text);
}

// Document upload hard block (spec: no SSN/ITIN, card numbers, or passwords
// in an uploaded file). Unlike the soft warning above, this is a real
// rejection, so the card check runs a Luhn checksum on top of the digit-count
// match to keep false positives (invoice numbers, tracking numbers) low.
const CARD_CANDIDATE_PATTERN = /\b(?:\d[ -]?){13,19}\b/g;
const PASSWORD_KEYWORD_PATTERN = /\bpassword\s*[:=]\s*\S+/i;

function passesLuhnChecksum(digits: string): boolean {
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function containsLikelyCreditCard(text: string): boolean {
  const candidates = text.match(CARD_CANDIDATE_PATTERN) ?? [];
  return candidates.some((candidate) => {
    const digits = candidate.replace(/[ -]/g, "");
    return digits.length >= 13 && digits.length <= 19 && passesLuhnChecksum(digits);
  });
}

export function containsLikelyPassword(text: string): boolean {
  return PASSWORD_KEYWORD_PATTERN.test(text);
}

export type SensitiveDataReason = "ssn_itin" | "credit_card" | "password";

export function findSensitiveDataReason(text: string): SensitiveDataReason | null {
  if (containsLikelySsnOrItin(text)) return "ssn_itin";
  if (containsLikelyCreditCard(text)) return "credit_card";
  if (containsLikelyPassword(text)) return "password";
  return null;
}
