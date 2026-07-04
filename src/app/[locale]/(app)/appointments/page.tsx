import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listAppointmentsWithClient } from "@/lib/queries/appointments";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";

export default async function AppointmentsPage() {
  const t = await getTranslations("Appointments");
  const configured = isDatabaseConfigured();

  let appointments: Awaited<ReturnType<typeof listAppointmentsWithClient>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      appointments = await listAppointmentsWithClient();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("title")}
        </h1>
        <Button render={<Link href="/appointments/new" />}>
          <Plus className="h-4 w-4" />
          {t("newAppointment")}
        </Button>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load appointments: {error}.
        </p>
      )}

      {configured && !error && (
        <AppointmentCalendar appointments={appointments} />
      )}
    </div>
  );
}
