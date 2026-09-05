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
