import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarPlus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { businessDateString } from "@/lib/dates";
import { requirePortalPage } from "@/lib/portal/page";
import { listPortalAppointments } from "@/lib/portal/queries";
import {
  canRequestAppointmentChange,
  formatPortalDate,
  formatPortalTime,
  portalAppointmentStatus,
} from "@/lib/portal/display";
import { PortalAppointmentsView, type PortalAppointmentView } from "@/components/portal/PortalAppointmentsView";

export default async function PortalAppointmentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePortalPage(locale);
  if (!ctx) return null;

  const appointments = await listPortalAppointments(ctx.db, ctx.clientId);
  const t = await getTranslations("Portal");
  const tService = await getTranslations("PublicServiceType");
  const tType = await getTranslations("AppointmentType");
  const now = new Date();

  // Everything the client component needs, already formatted server-side
  // in Florida time — no raw database rows cross to the browser.
  const view: PortalAppointmentView[] = appointments.map((a) => ({
    id: a.id,
    dateKey: businessDateString(a.startAt),
    dateLabel: formatPortalDate(a.startAt, locale),
    timeLabel: formatPortalTime(a.startAt),
    service: tService(a.serviceType),
    type: tType(a.appointmentType),
    status: portalAppointmentStatus(a.status),
    isPast: a.endAt <= now,
    canRequestChange: canRequestAppointmentChange(a.status, a.startAt, now),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl text-foreground">{t("appointments.title")}</h1>
        <Button nativeButton={false} render={<Link href="/book" />}>
          <CalendarPlus className="size-4" aria-hidden />
          {t("appointments.book")}
        </Button>
      </div>
      <PortalAppointmentsView appointments={view} today={businessDateString(now)} />
    </div>
  );
}
