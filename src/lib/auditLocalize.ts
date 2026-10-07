// Audit-log summaries are stored in English (one stable format for the
// Security log and exports). The alliance record's "Activity" shows them in
// the page language: each known action has a sentence in messages
// (AuditActions), and the useful detail — a file, service or business
// name — is taken from the stored summary. Unknown actions keep the stored
// summary as-is.

// The detail worth keeping from a stored summary: a "quoted name", or what
// follows the first ": ".
export function auditDetail(summary: string): string {
  const quoted = summary.match(/"([^"]+)"/);
  if (quoted) return quoted[1];
  const colon = summary.indexOf(": ");
  return colon >= 0 ? summary.slice(colon + 2).trim() : "";
}

export const auditMessageKey = (action: string) => action.replace(/\./g, "_");

export function localizeAuditSummary(
  entry: { action: string; summary: string | null },
  t: { has: (key: string) => boolean; (key: string, values?: Record<string, string>): string },
): string {
  const key = auditMessageKey(entry.action);
  if (!t.has(key)) return entry.summary ?? entry.action;
  const detail = auditDetail(entry.summary ?? "");
  return t(key, { detail: detail || "none" });
}
