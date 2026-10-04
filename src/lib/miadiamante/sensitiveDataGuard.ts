// MIADIAMANTE AI Foundation — Phase 2B-3 provider foundation. Owner
// requirement: SSN, ITIN, passwords, API keys, authentication secrets,
// and equivalent sensitive identifiers must be blocked from ever
// reaching a model provider.
//
// Reuses src/lib/sensitiveDataCheck.ts verbatim for SSN/ITIN, credit
// card, and password detection — the exact same patterns already
// reviewed and used by the Communications module's own client-side
// warning (Phase 4, Session 7) — rather than reinventing a second,
// driftable copy of those regexes. The only NEW category added here is
// API keys/auth secrets/tokens, which that module never needed to
// detect.
//
// This is a best-effort, keyword/shape-based block — explicitly NOT an
// exhaustive secret-scanner, and the project convention (see
// sensitiveDataCheck.ts's own comments) is to say so rather than
// overstate detection confidence. Unlike the Communications module's
// SOFT warning, this is a HARD block: a match here must prevent the
// request from reaching generateText() at all, never just log a
// warning.
import {
  findSensitiveDataReason,
  type SensitiveDataReason,
} from "@/lib/sensitiveDataCheck";

// Keyword-adjacent pattern, mirroring sensitiveDataCheck.ts's own
// PASSWORD_KEYWORD_PATTERN style exactly (same shape, different keyword
// set) — api_key/secret/token/auth_secret followed by a labeled value
// (key: value or key=value).
const API_KEY_KEYWORD_PATTERN =
  /\b(api[_-]?key|secret|auth(?:entication)?[_-]?secret|access[_-]?token)\s*[:=]\s*\S+/i;

// "Authorization: Bearer <token>" style — the token follows "bearer"
// directly with whitespace, never a colon/equals after "bearer" itself,
// so this needs its own, separate pattern from the labeled-value one
// above.
const BEARER_TOKEN_PATTERN = /\bbearer\s+\S+/i;

// Common real-world API key prefixes (OpenAI/Stripe-style sk-/pk-,
// GitHub ghp_, Google AIza...). Conservative and non-exhaustive by
// design — a false negative here is still caught by the keyword pattern
// above in most real usage (keys are usually introduced with a label).
const COMMON_KEY_PREFIX_PATTERN =
  /\b(sk-[a-zA-Z0-9]{10,}|pk-[a-zA-Z0-9]{10,}|ghp_[a-zA-Z0-9]{20,}|AIza[a-zA-Z0-9_-]{20,})/;

export type MiadiamanteSensitiveDataReason = SensitiveDataReason | "api_key_or_secret";

export function findMiadiamanteSensitiveDataReason(
  text: string,
): MiadiamanteSensitiveDataReason | null {
  const existing = findSensitiveDataReason(text);
  if (existing) return existing;
  if (
    API_KEY_KEYWORD_PATTERN.test(text) ||
    BEARER_TOKEN_PATTERN.test(text) ||
    COMMON_KEY_PREFIX_PATTERN.test(text)
  ) {
    return "api_key_or_secret";
  }
  return null;
}

export class SensitiveDataBlockedError extends Error {
  readonly reason: MiadiamanteSensitiveDataReason;

  constructor(reason: MiadiamanteSensitiveDataReason) {
    // Neutral, caller-safe text — never echoes the matched text itself,
    // matching this codebase's established side-channel-safety
    // discipline (see capabilityRunner.ts's own NEUTRAL_UNAVAILABLE_MESSAGE
    // notes): the specific reason is available on the error object for
    // internal/operator use, never required to be shown to an end user.
    super("This message cannot be sent to MIADIAMANTE's AI provider because it appears to contain sensitive information.");
    this.name = "SensitiveDataBlockedError";
    this.reason = reason;
  }
}

// Throws SensitiveDataBlockedError if the text contains anything matching
// the categories above. Called from provider.ts as the very first step
// of generate(), before any network call is constructed.
export function assertNoSensitiveData(text: string): void {
  const reason = findMiadiamanteSensitiveDataReason(text);
  if (reason) {
    throw new SensitiveDataBlockedError(reason);
  }
}
