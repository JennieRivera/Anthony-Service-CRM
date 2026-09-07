import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAppointmentById } from "@/lib/queries/appointments";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppointmentStatusBadge } from "@/components/appointments/AppointmentStatusBadge";
import { AppointmentDetailActions } from "@/components/appointments/AppointmentDetailActions";

function formatDuration(startAt: Date, endAt: Date) {
  const minutes = Math.round((endAt.getTime() - startAt.getTime()) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}min` : `${hours}h`;
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Appointments");
  const td = await getTranslations("Appointments.detail");
  const tService = await getTranslations("ServiceType");
  const tType = await getTranslations("AppointmentType");
  const tPaymentStatus = await getTranslations("PaymentStatus");

  const result = await getAppointmentById(id);
  if (!result) notFound();
  const { appointment, client, companyName, caseTitle } = result;

  const startAt = new Date(appointment.startAt);
  const endAt = new Date(appointment.endAt);

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link href="/appointments" className="text-sm text-muted-foreground underline">
          &larr; {t("backToAppointments")}
        </Link>
        <Button variant="outline" render={<Link href={`/appointments/${id}/edit`} />}>
          <Pencil className="h-4 w-4" />
          {t("editAppointment")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl text-foreground">{appointment.title}</h1>
            <Badge variant="outline">{tService(appointment.serviceType)}</Badge>
          </div>
          <AppointmentStatusBadge status={appointment.status} />
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{td("clientName")}</p>
            <Link href={`/clients/${client.id}`} className="text-foreground hover:underline">
              {client.fullName}
            </Link>
          </div>
          {companyName && (
            <div>
              <p className="text-muted-foreground">{td("business")}</p>
              <p className="text-foreground">{companyName}</p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">{td("phone")}</p>
            <p className="text-foreground">{client.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{td("email")}</p>
            <p className="text-foreground">{client.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{td("language")}</p>
            <p className="text-foreground">
              {client.preferredLanguage === "es" ? "Español" : "English"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{td("date")}</p>
            <p className="text-foreground">{startAt.toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{td("time")}</p>
            <p className="text-foreground">
              {startAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
              {" – "}
              {endAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{td("duration")}</p>
            <p className="text-foreground">{formatDuration(startAt, endAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.appointmentType")}</p>
            <p className="text-foreground">{tType(appointment.appointmentType)}</p>
          </div>
          {appointment.location && (
            <div>
              <p className="text-muted-foreground">{t("form.location")}</p>
              <p className="text-foreground">{appointment.location}</p>
            </div>
          )}
          {caseTitle && (
            <div>
              <p className="text-muted-foreground">{t("form.case")}</p>
              <p className="text-foreground">{caseTitle}</p>
            </div>
          )}
          {appointment.referralSource && (
            <div>
              <p className="text-muted-foreground">{t("form.referralSource")}</p>
              <p className="text-foreground">{appointment.referralSource}</p>
            </div>
          )}
          {appointment.paymentRequired && (
            <div>
              <p className="text-muted-foreground">{t("form.paymentStatus")}</p>
              <p className="text-foreground">
                {appointment.paymentStatus ? tPaymentStatus(appointment.paymentStatus) : "—"}
              </p>
            </div>
          )}
        </div>
      </div>

      {appointment.documentsNeeded && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm">
          <p className="text-muted-foreground">{t("form.documentsNeeded")}</p>
          <p className="mt-1 whitespace-pre-wrap text-foreground">
            {appointment.documentsNeeded}
          </p>
        </div>
      )}

      {appointment.notes && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm">
          <p className="text-muted-foreground">{t("form.notes")}</p>
          <p className="mt-1 whitespace-pre-wrap text-foreground">{appointment.notes}</p>
        </div>
      )}

      <AppointmentDetailActions
        appointment={appointment}
        clientId={client.id}
        companyId={client.companyId}
        caseId={appointment.caseId}
      />
    </div>
  );
}
