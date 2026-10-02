import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/dates";
import type { Appointment } from "@/lib/db/schema";

// Phase 2G — read-only, reuses the client's existing appointments rows
// (same ones the Calendar module already shows) — no second calendar.
export async function StudentAppointmentsList({
  appointments,
}: {
  appointments: Appointment[];
}) {
  const t = await getTranslations("AcademyStudent360");
  const tStatus = await getTranslations("AppointmentStatus");

  if (appointments.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noAppointments")}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {appointments.slice(0, 10).map((a) => (
        <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2.5 text-sm">
          <Link href={`/appointments/${a.id}`} className="min-w-0 flex-1 truncate text-foreground underline">
            {a.title}
          </Link>
          <Badge variant="outline">{tStatus(a.status)}</Badge>
          <span className="text-xs text-muted-foreground">{formatDateTime(a.startAt)}</span>
        </li>
      ))}
    </ul>
  );
}
