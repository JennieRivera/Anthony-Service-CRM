"use client";

import { useMemo } from "react";
import { Calendar, dateFnsLocalizer, type Event, type EventProps } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS, es } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getContrastTextColor } from "@/lib/color";
import { formatTime } from "@/lib/dates";
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

  return (
    <div className="flex flex-col overflow-hidden leading-tight">
      <span className="truncate font-medium">{event.clientName}</span>
      <span className="truncate text-[0.85em] opacity-90">
        {tService(event.serviceType)}
      </span>
      <span className="truncate text-[0.8em] opacity-80">
        {formatTime(event.startAt)}
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
        // Every toolbar/view label (react-big-calendar defaults to English).
        // Day and month names come from the date-fns locale via culture.
        messages={{
          today: t("today"),
          previous: t("calendar.previous"),
          next: t("calendar.next"),
          month: t("calendar.month"),
          week: t("calendar.week"),
          day: t("calendar.day"),
          agenda: t("calendar.agenda"),
          date: t("calendar.date"),
          time: t("calendar.time"),
          event: t("calendar.event"),
          allDay: t("calendar.allDay"),
          noEventsInRange: t("calendar.noEventsInRange"),
          showMore: (total: number) => t("calendar.showMore", { total }),
        }}
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
          router.push(`/appointments/${(event as unknown as AppointmentEvent).id}`)
        }
        onSelectSlot={(slotInfo) => {
          // Keep the slot's own local wall-clock components (not UTC) so the
          // prefilled time on the New Appointment form matches what was
          // clicked, regardless of the viewer's or server's timezone.
          const local = format(slotInfo.start, "yyyy-MM-dd'T'HH:mm");
          router.push(`/appointments/new?start=${local}`);
        }}
        selectable
      />
    </div>
  );
}
