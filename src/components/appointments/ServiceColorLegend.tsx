import { getTranslations } from "next-intl/server";
import type { ServiceColorSetting } from "@/lib/db/schema";
import { serviceTypeValues } from "@/lib/validation/client";

// CALENDAR-PLAN.md section 5 — only the service types an appointment can
// actually be tagged with today (serviceTypeValues, plus the generic
// "other" fallback). commercial_finance_referral and
// community_strategic_alliances are real, editable rows in Settings (see
// schema.ts's comment on serviceColorSettings) but can never appear on an
// appointment yet, so showing them here would be a legend entry for a
// color nothing on the calendar ever uses.
const LEGEND_KEYS = [...serviceTypeValues, "other"] as const;

export async function ServiceColorLegend({
  colors,
}: {
  colors: ServiceColorSetting[];
}) {
  const tService = await getTranslations("ServiceType");
  const tKey = await getTranslations("ServiceColorKey");
  const byKey = new Map(colors.map((c) => [c.key, c.colorHex]));

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-border bg-card p-3 text-sm">
      {LEGEND_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: byKey.get(key) ?? "#78909C" }}
            aria-hidden="true"
          />
          <span className="text-muted-foreground">
            {key === "other" ? tKey("other") : tService(key)}
          </span>
        </div>
      ))}
    </div>
  );
}
