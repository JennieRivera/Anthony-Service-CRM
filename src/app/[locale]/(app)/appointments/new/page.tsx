import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { listClientsForSelect } from "@/lib/queries/cases";
import { createAppointmentAction } from "../actions";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; start?: string }>;
}) {
  const t = await getTranslations("Appointments");
  const { clientId, start } = await searchParams;
  const clients = await listClientsForSelect();

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newAppointment")}
        </h1>
        <Link
          href="/appointments"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToAppointments")}
        </Link>
      </div>

      <AppointmentForm
        clients={clients}
        defaultClientId={clientId}
        defaultStart={start}
        onSubmit={createAppointmentAction}
      />
    </div>
  );
}
