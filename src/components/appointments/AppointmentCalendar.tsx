"use client";

import { useMemo } from "react";
import { Calendar, dateFnsLocalizer, type Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";

const locales = { "en-US": enUS, es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: enUS }),
  getDay,
  locales,
});

export type AppointmentEvent = {
  id: string;
  title: string;
  serviceType: string;
  startAt: Date | string;
  endAt: Date | string;
  clientName: string;
};

const serviceColors: Record<string, string> = {
  online_notary: "#0F1A2B",
  document_prep: "#4A5A3A",
  tax_prep: "#B8964A",
  company_registration: "#3E5C76",
  credit_financing: "#6E4A6E",
  leadership: "#7A5230",
};

export function AppointmentCalendar({
  appointments,
}: {
  appointments: AppointmentEvent[];
}) {
  const t = useTranslations("Appointments");
  const locale = useLocale();
  const router = useRouter();

  const events: (Event & AppointmentEvent)[] = useMemo(
    () =>
      appointments.map((a) => ({
        ...a,
        start: new Date(a.startAt),
        end: new Date(a.endAt),
        resource: a,
      })),
    [appointments],
  );

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Calendar
        localizer={localizer}
        culture={locale === "es" ? "es" : "en-US"}
        events={events}
        startAccessor="start"
        endAccessor="end"
        titleAccessor={(event) =>
          `${event.title} — ${(event as unknown as AppointmentEvent).clientName}`
        }
        style={{ height: 650 }}
        views={["month", "week", "day", "agenda"]}
        messages={{ today: t("today") }}
        eventPropGetter={(event) => ({
          style: {
            backgroundColor:
              serviceColors[(event as unknown as AppointmentEvent).serviceType] ??
              "var(--primary)",
            border: "none",
          },
        })}
        onSelectEvent={(event) =>
          router.push(`/appointments/${(event as unknown as AppointmentEvent).id}/edit`)
        }
        onSelectSlot={(slotInfo) => {
          const iso = slotInfo.start.toISOString().slice(0, 16);
          router.push(`/appointments/new?start=${iso}`);
        }}
        selectable
      />
    </div>
  );
}
