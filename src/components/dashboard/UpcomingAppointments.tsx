import { getTranslations } from "next-intl/server";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { listUpcomingAppointments } from "@/lib/queries/appointments";

export async function UpcomingAppointments({
  appointments,
}: {
  appointments: Awaited<ReturnType<typeof listUpcomingAppointments>>;
}) {
  const t = await getTranslations("Dashboard");
  const tService = await getTranslations("ServiceType");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("upcomingAppointments")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {appointments.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noUpcoming")}</p>
        )}
        {appointments.map((appt) => (
          <Link
            key={appt.id}
            href={`/appointments/${appt.id}/edit`}
            className="flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted"
          >
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {appt.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {appt.clientName} · {tService(appt.serviceType)}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(appt.startAt).toLocaleString()}
              </span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
