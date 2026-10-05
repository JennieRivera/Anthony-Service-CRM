import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarPlus, ChevronRight, Scale, Upload } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import { requirePortalPage } from "@/lib/portal/page";
import { getPortalClient, listPortalAppointments, listPortalCases } from "@/lib/portal/queries";
import { formatPortalDate, formatPortalTime, isActiveCaseStatus } from "@/lib/portal/display";
import { AppointmentStatusPill, CaseStatusPill } from "@/components/portal/PortalBadges";

export default async function PortalHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePortalPage(locale);
  if (!ctx) return null;

  const [client, cases, appointments, texts] = await Promise.all([
    getPortalClient(ctx.db, ctx.clientId),
    listPortalCases(ctx.db, ctx.clientId),
    listPortalAppointments(ctx.db, ctx.clientId),
    getLegalTexts(ctx.db),
  ]);
  const t = await getTranslations("Portal");
  const tService = await getTranslations("PublicServiceType");

  const now = new Date();
  const activeCases = cases.filter((c) => isActiveCaseStatus(c.status));
  const upcoming = appointments
    .filter((a) => a.endAt > now && a.status !== "cancelled" && a.status !== "no_show")
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("home.title", { name: client?.fullName ?? "" })}</h1>
        <p className="text-muted-foreground">{t("home.intro")}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" className="h-12" nativeButton={false} render={<Link href="/portal/documents#upload" />}>
          <Upload className="size-4" aria-hidden />
          {t("home.uploadCta")}
        </Button>
        <Button size="lg" variant="outline" className="h-12" nativeButton={false} render={<Link href="/book" />}>
          <CalendarPlus className="size-4" aria-hidden />
          {t("home.bookCta")}
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">{t("home.activeCases")}</h2>
        {activeCases.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{t("home.noActiveCases")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activeCases.map((c) => (
              <li key={c.id}>
                <Link href={`/portal/cases/${c.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/60">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="truncate font-medium text-foreground">{c.title}</span>
                    <span className="text-sm text-muted-foreground">{tService(c.serviceType)}</span>
                    {c.nextAction && <span className="text-sm text-foreground">{t("cases.nextAction")}: {c.nextAction}</span>}
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
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">{t("home.upcomingAppointments")}</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{t("home.noUpcoming")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcoming.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{formatPortalDate(a.startAt, locale)}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatPortalTime(a.startAt)} · {tService(a.serviceType)}
                  </span>
                </div>
                <AppointmentStatusPill status={a.status} />
              </li>
            ))}
          </ul>
        )}
        <Link href="/portal/appointments" className="self-start text-sm text-primary underline">
          {t("home.allAppointments")}
        </Link>
      </section>

      <p className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-sm text-foreground">
        <Scale className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>{pickLocale(texts.not_a_law_firm, locale)}</span>
      </p>
    </div>
  );
}
