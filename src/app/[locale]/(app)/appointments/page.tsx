import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  listAppointmentsWithClient,
  type AppointmentListFilters,
} from "@/lib/queries/appointments";
import { listServiceColorSettings, getServiceColorMap } from "@/lib/queries/serviceColors";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { ServiceColorLegend } from "@/components/appointments/ServiceColorLegend";
import { AppointmentFilters } from "@/components/appointments/AppointmentFilters";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<AppointmentListFilters>;
}) {
  const t = await getTranslations("Appointments");
  const configured = isDatabaseConfigured();
  const filters = await searchParams;

  let appointments: Awaited<ReturnType<typeof listAppointmentsWithClient>> = [];
  let colorSettings: Awaited<ReturnType<typeof listServiceColorSettings>> = [];
  let colorMap: Record<string, string> = {};
  let error: string | null = null;

  if (configured) {
    try {
      [appointments, colorSettings, colorMap] = await Promise.all([
        listAppointmentsWithClient(filters),
        listServiceColorSettings(),
        getServiceColorMap(),
      ]);
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
        <>
          <ServiceColorLegend colors={colorSettings} />
          <AppointmentFilters activeFilters={filters} colors={colorMap} />
          <AppointmentCalendar appointments={appointments} colors={colorMap} />
        </>
      )}
    </div>
  );
}
