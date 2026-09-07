"use client";

import { useMemo } from "react";
import { Calendar, dateFnsLocalizer, type Event, type EventProps } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getContrastTextColor } from "@/lib/color";
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
  status: string;
  startAt: Date | string;
  endAt: Date | string;
  clientName: string;
};

function CalendarEventCard({ event }: EventProps<Event & AppointmentEvent>) {
  const tService = useTranslations("ServiceType");
  const tStatus = useTranslations("AppointmentStatus");
  const start = new Date(event.startAt);

  return (
    <div className="flex flex-col overflow-hidden leading-tight">
      <span className="truncate font-medium">{event.clientName}</span>
      <span className="truncate text-[0.85em] opacity-90">
        {tService(event.serviceType)}
      </span>
      <span className="truncate text-[0.8em] opacity-80">
        {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        {" · "}
        {tStatus(event.status)}
      </span>
    </div>
  );
}

export function AppointmentCalendar({
  appointments,
  colors,
}: {
  appointments: AppointmentEvent[];
  colors: Record<string, string>;
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
        style={{ height: 650 }}
        views={["month", "week", "day", "agenda"]}
        messages={{ today: t("today") }}
        components={{ event: CalendarEventCard }}
        eventPropGetter={(event) => {
          const serviceType = (event as unknown as AppointmentEvent).serviceType;
          const backgroundColor = colors[serviceType] ?? colors.other ?? "#78909C";
          return {
            style: {
              backgroundColor,
              color: getContrastTextColor(backgroundColor),
              border: "none",
            },
          };
        }}
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
