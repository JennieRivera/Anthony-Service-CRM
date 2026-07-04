import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAppointmentById } from "@/lib/queries/appointments";
import { listClientsForSelect } from "@/lib/queries/cases";
import { Link } from "@/i18n/navigation";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { updateAppointmentAction } from "../../actions";
import type { AppointmentFormValues } from "@/lib/validation/appointment";

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Appointments");

  const [result, clients] = await Promise.all([
    getAppointmentById(id),
    listClientsForSelect(),
  ]);

  if (!result) notFound();

  async function submit(values: AppointmentFormValues) {
    "use server";
    await updateAppointmentAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("editAppointment")}
        </h1>
        <Link
          href="/appointments"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToAppointments")}
        </Link>
      </div>

      <AppointmentForm
        appointment={result.appointment}
        clients={clients}
        onSubmit={submit}
      />
    </div>
  );
}
