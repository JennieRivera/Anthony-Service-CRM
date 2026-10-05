"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PortalAppointmentStatus } from "@/lib/portal/display";

export type PortalAppointmentView = {
  id: string;
  dateKey: string; // "YYYY-MM-DD", Florida time
  dateLabel: string;
  timeLabel: string;
  service: string;
  type: string;
  status: PortalAppointmentStatus;
  isPast: boolean;
  canRequestChange: boolean;
};

function monthGrid(year: number, month: number) {
  // month is 0-based; weeks start on Sunday, like a US wall calendar.
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

function ChangeRequestForm({ appointmentId, onDone }: { appointmentId: string; onDone: (msg: string) => void }) {
  const t = useTranslations("Portal.appointments");
  const [kind, setKind] = useState<"reschedule" | "cancel">("reschedule");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/appointments/${appointmentId}/change-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { result?: string };
      if (!res.ok) throw new Error(String(res.status));
      onDone(data.result === "already_requested" ? t("alreadyRequested") : t("requestSent"));
    } catch {
      setError(t("requestError"));
      setSending(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-lg border border-border bg-secondary/40 p-3">
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        {(["reschedule", "cancel"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={cn(
              "min-h-11 rounded-lg border text-sm font-medium",
              kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
            )}
          >
            {k === "reschedule" ? t("reschedule") : t("cancel")}
          </button>
        ))}
      </div>
      <Textarea
        rows={2}
        maxLength={500}
        placeholder={t("messagePlaceholder")}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="text-base"
      />
      <p className="text-xs text-muted-foreground">{t("requestNote")}</p>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="button" onClick={send} disabled={sending}>
        {t("sendRequest")}
      </Button>
    </div>
  );
}

export function PortalAppointmentsView({ appointments, today }: { appointments: PortalAppointmentView[]; today: string }) {
  const t = useTranslations("Portal");
  const locale = useLocale();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [openRequest, setOpenRequest] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, string>>({});

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of appointments) if (a.status !== "cancelled") map.set(a.dateKey, (map.get(a.dateKey) ?? 0) + 1);
    return map;
  }, [appointments]);

  const cells = monthGrid(year, month);
  const rawMonthLabel = new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1)));
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 1, 1 + i))),
  );

  const shift = (delta: number) => {
    const d = new Date(Date.UTC(year, month + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth());
    setSelectedDay(null);
  };

  const visible = selectedDay ? appointments.filter((a) => a.dateKey === selectedDay) : appointments;
  const upcoming = visible.filter((a) => !a.isPast);
  const past = visible.filter((a) => a.isPast).reverse();

  const renderItem = (a: PortalAppointmentView) => (
    <li key={a.id} className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{a.dateLabel}</span>
          <span className="text-sm text-muted-foreground">
            {a.timeLabel} · {a.service} · {a.type}
          </span>
        </div>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
          {t(`appointmentStatus.${a.status}`)}
        </span>
      </div>
      {notices[a.id] ? (
        <p className="mt-3 text-sm text-foreground" role="status">{notices[a.id]}</p>
      ) : (
        a.canRequestChange &&
        (openRequest === a.id ? (
          <ChangeRequestForm
            appointmentId={a.id}
            onDone={(msg) => {
              setNotices((n) => ({ ...n, [a.id]: msg }));
              setOpenRequest(null);
            }}
          />
        ) : (
          <button type="button" onClick={() => setOpenRequest(a.id)} className="mt-3 text-sm text-primary underline">
            {t("appointments.requestChange")}
          </button>
        ))
      )}
    </li>
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-4" aria-label={t("appointments.calendar")}>
        <div className="mb-3 flex items-center justify-between">
          <button type="button" onClick={() => shift(-1)} className="rounded-full p-2 hover:bg-secondary" aria-label={t("appointments.prevMonth")}>
            <ChevronLeft className="size-5" />
          </button>
          <span className="font-medium text-foreground">{monthLabel}</span>
          <button type="button" onClick={() => shift(1)} className="rounded-full p-2 hover:bg-secondary" aria-label={t("appointments.nextMonth")}>
            <ChevronRight className="size-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
          {weekdays.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <span key={i} />;
            const count = byDay.get(day) ?? 0;
            const selected = day === selectedDay;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(selected ? null : day)}
                aria-pressed={selected}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-lg text-sm",
                  selected ? "bg-primary text-primary-foreground" : count ? "bg-secondary font-semibold text-foreground" : "text-foreground hover:bg-secondary/60",
                  day === today && !selected && "ring-1 ring-primary",
                )}
              >
                {Number(day.slice(8))}
                {count > 0 && <span className={cn("mt-0.5 size-1.5 rounded-full", selected ? "bg-primary-foreground" : "bg-primary")} />}
              </button>
            );
          })}
        </div>
        {selectedDay && (
          <button type="button" onClick={() => setSelectedDay(null)} className="mt-3 text-sm text-primary underline">
            {t("appointments.showAll")}
          </button>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-foreground">{t("appointments.upcoming")}</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{t("appointments.noUpcoming")}</p>
        ) : (
          <ul className="flex flex-col gap-2">{upcoming.map(renderItem)}</ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-foreground">{t("appointments.past")}</h2>
          <ul className="flex flex-col gap-2">{past.map(renderItem)}</ul>
        </section>
      )}
    </div>
  );
}
