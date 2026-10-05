import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePortalPage } from "@/lib/portal/page";
import { listPortalCases } from "@/lib/portal/queries";
import { formatPortalShortDate } from "@/lib/portal/display";
import { CaseStatusPill } from "@/components/portal/PortalBadges";

export default async function PortalCasesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePortalPage(locale);
  if (!ctx) return null;

  const cases = await listPortalCases(ctx.db, ctx.clientId);
  const t = await getTranslations("Portal");
  const tService = await getTranslations("PublicServiceType");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl text-foreground">{t("cases.title")}</h1>
      {cases.length === 0 ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{t("cases.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {cases.map((c) => (
            <li key={c.id}>
              <Link href={`/portal/cases/${c.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/60">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium text-foreground">{c.title}</span>
                  <span className="text-sm text-muted-foreground">
                    {tService(c.serviceType)} · {t("cases.since", { date: formatPortalShortDate(c.startDate, locale) })}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CaseStatusPill status={c.status} />
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
