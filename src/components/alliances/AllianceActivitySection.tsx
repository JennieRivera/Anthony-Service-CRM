import { formatDateTime } from "@/lib/dates";
import { getTranslations } from "next-intl/server";
import type { AuditLogEntry } from "@/lib/db/schema";
import { localizeAuditSummary } from "@/lib/auditLocalize";

// B2B Network Foundation, section 20 — reuses the existing audit_log
// table (see listAuditLogForEntity) rather than a second activity system.
// Read-only: there is no "clear activity" control, same as the Security
// audit log elsewhere in the app.
export async function AllianceActivitySection({ activity }: { activity: AuditLogEntry[] }) {
  const t = await getTranslations("Alliances");
  // Stored in English; shown in the page language (unknown actions as-is).
  const tAction = await getTranslations("AuditActions");

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
      <h2 className="font-heading text-lg text-foreground">{t("sections.activity")}</h2>
      {activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("activity.empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {activity.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
            >
              <span className="text-foreground" title={entry.action}>
                {localizeAuditSummary(entry, tAction as unknown as Parameters<typeof localizeAuditSummary>[1])}
              </span>
              <span className="text-muted-foreground">
                {formatDateTime(entry.createdAt)}
                {entry.actorEmail ? ` · ${entry.actorEmail}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
