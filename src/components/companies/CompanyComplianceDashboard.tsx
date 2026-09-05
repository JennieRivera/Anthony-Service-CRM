import { useTranslations } from "next-intl";
import type {
  CompanyComplianceSummary,
  ComplianceIndicatorStatus,
} from "@/lib/queries/companyCompliance";

const dotColor: Record<ComplianceIndicatorStatus, string> = {
  green: "bg-emerald-500",
  gold: "bg-amber-500",
  red: "bg-red-500",
  gray: "bg-muted-foreground/40",
};

const indicatorKeys: (keyof CompanyComplianceSummary)[] = [
  "entity",
  "registeredAgent",
  "annualReport",
  "salesTax",
  "businessLicense",
  "insurance",
  "tax",
  "bookkeeping",
  "documentCompleteness",
  "financingReadiness",
];

export function CompanyComplianceDashboard({
  summary,
}: {
  summary: CompanyComplianceSummary;
}) {
  const t = useTranslations("Companies.compliance");
  const tStatus = useTranslations("Companies.compliance.status");

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
      <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {indicatorKeys.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
          >
            <span className="text-sm text-foreground">{t(key)}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={`h-2.5 w-2.5 rounded-full ${dotColor[summary[key]]}`}
                aria-hidden
              />
              {tStatus(summary[key])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
