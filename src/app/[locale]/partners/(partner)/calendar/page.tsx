import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePartnerPage } from "@/lib/partners/page";
import { listPartnerCalendar } from "@/lib/partners/calendar";
import { PartnerCalendar } from "@/components/partners/PartnerCalendar";

// The ally's calendar: its meetings with AMS, and — only date and service,
// only with the client's consent — the appointments of its referrals.
export default async function PartnerCalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePartnerPage(locale);
  if (!ctx) return null;

  const now = new Date();
  const calendar = await listPartnerCalendar(ctx.db, ctx.allianceId, now);
  const upcoming = calendar.meetings.filter((m) => new Date(m.endAt) >= now);
  const past = calendar.meetings.filter((m) => new Date(m.endAt) < now).reverse();
  const t = await getTranslations("Partners.calendar");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <PartnerCalendar upcoming={upcoming} past={past} referralAppointments={calendar.referralAppointments} />
    </div>
  );
}
