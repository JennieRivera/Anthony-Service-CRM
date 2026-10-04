"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addOnlineBookingBlockedDateAction,
  removeOnlineBookingBlockedDateAction,
  saveOnlineBookingSettingsAction,
} from "@/app/[locale]/(app)/settings/online-booking/actions";
import type { OnlineBookingConfig } from "@/lib/queries/onlineBooking";
import type { OnlineBookingSettingsFormValues } from "@/lib/validation/onlineBooking";

type Draft = {
  enabled: boolean;
  weeklyHours: { open: boolean; start: string; end: string }[];
  slotIntervalMinutes: string;
  bufferMinutes: string;
  minNoticeHours: string;
  maxDaysAhead: string;
  services: { serviceType: OnlineBookingConfig["services"][number]["serviceType"]; bookable: boolean; durationMinutes: string }[];
};

function toDraft(config: OnlineBookingConfig): Draft {
  const s = config.settings;
  return {
    enabled: s.enabled,
    weeklyHours: s.weeklyHours.map((d) =>
      d ? { open: true, start: d.start, end: d.end } : { open: false, start: "09:00", end: "17:00" },
    ),
    slotIntervalMinutes: String(s.slotIntervalMinutes),
    bufferMinutes: String(s.bufferMinutes),
    minNoticeHours: String(s.minNoticeMinutes / 60),
    maxDaysAhead: String(s.maxDaysAhead),
    services: config.services.map((x) => ({
      serviceType: x.serviceType,
      bookable: x.bookable,
      durationMinutes: String(x.durationMinutes),
    })),
  };
}

// Monday first, the way a business week reads.
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function OnlineBookingSettingsManager({ config }: { config: OnlineBookingConfig }) {
  const t = useTranslations("OnlineBooking");
  const tService = useTranslations("ServiceType");
  const [draft, setDraft] = useState<Draft>(() => toDraft(config));
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [blockedDate, setBlockedDate] = useState("");
  const [blockedReason, setBlockedReason] = useState("");
  const [blockedError, setBlockedError] = useState<string | null>(null);

  function update(patch: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...patch }));
    setMessage(null);
  }

  function updateDay(index: number, patch: Partial<Draft["weeklyHours"][number]>) {
    update({ weeklyHours: draft.weeklyHours.map((d, i) => (i === index ? { ...d, ...patch } : d)) });
  }

  function updateService(index: number, patch: Partial<Draft["services"][number]>) {
    update({ services: draft.services.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  }

  function save() {
    const values: OnlineBookingSettingsFormValues = {
      enabled: draft.enabled,
      weeklyHours: draft.weeklyHours,
      slotIntervalMinutes: draft.slotIntervalMinutes,
      bufferMinutes: draft.bufferMinutes,
      minNoticeMinutes: Math.round(Number(draft.minNoticeHours) * 60),
      maxDaysAhead: draft.maxDaysAhead,
      services: draft.services,
    };
    startTransition(async () => {
      try {
        await saveOnlineBookingSettingsAction(values);
        setMessage({ kind: "ok", text: t("saved") });
      } catch (err) {
        setMessage({ kind: "error", text: err instanceof Error ? err.message : t("error") });
      }
    });
  }

  function addBlocked() {
    setBlockedError(null);
    startTransition(async () => {
      try {
        await addOnlineBookingBlockedDateAction({ date: blockedDate, reason: blockedReason });
        setBlockedDate("");
        setBlockedReason("");
      } catch (err) {
        setBlockedError(err instanceof Error ? err.message : t("error"));
      }
    });
  }

  function removeBlocked(id: string) {
    startTransition(async () => {
      await removeOnlineBookingBlockedDateAction(id);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <Label htmlFor="ob-enabled">{t("enabled")}</Label>
          <Switch id="ob-enabled" checked={draft.enabled} onCheckedChange={(v) => update({ enabled: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("hoursTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {DAY_ORDER.map((dayIndex) => {
            const day = draft.weeklyHours[dayIndex];
            return (
              <div key={dayIndex} className="flex flex-wrap items-center gap-3">
                <span className="w-28 text-sm font-medium text-foreground">
                  {t(`days.${dayIndex}` as "days.0")}
                </span>
                <Switch
                  checked={day.open}
                  onCheckedChange={(v) => updateDay(dayIndex, { open: v })}
                  aria-label={`${t(`days.${dayIndex}` as "days.0")} — ${day.open ? t("open") : t("closed")}`}
                />
                {day.open ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Label className="sr-only" htmlFor={`start-${dayIndex}`}>{t("from")}</Label>
                    <Input id={`start-${dayIndex}`} type="time" step={900} value={day.start} onChange={(e) => updateDay(dayIndex, { start: e.target.value })} className="w-32" />
                    <span className="text-muted-foreground">–</span>
                    <Label className="sr-only" htmlFor={`end-${dayIndex}`}>{t("to")}</Label>
                    <Input id={`end-${dayIndex}`} type="time" step={900} value={day.end} onChange={(e) => updateDay(dayIndex, { end: e.target.value })} className="w-32" />
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">{t("closed")}</span>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("rulesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["slotIntervalMinutes", "slotInterval"],
              ["bufferMinutes", "buffer"],
              ["minNoticeHours", "minNotice"],
              ["maxDaysAhead", "maxDaysAhead"],
            ] as const
          ).map(([field, label]) => (
            <div key={field} className="flex flex-col gap-1.5">
              <Label htmlFor={`ob-${field}`}>{t(label)}</Label>
              <Input
                id={`ob-${field}`}
                type="number"
                min={0}
                step={field === "minNoticeHours" ? 0.5 : 1}
                value={draft[field]}
                onChange={(e) => update({ [field]: e.target.value } as Partial<Draft>)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("servicesTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("servicesDescription")}</p>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {draft.services.map((s, index) => (
            <div key={s.serviceType} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={s.bookable}
                  onCheckedChange={(v) => updateService(index, { bookable: v })}
                  aria-label={`${tService(s.serviceType)} — ${t("bookable")}`}
                />
                <span className="text-sm text-foreground">{tService(s.serviceType)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`dur-${s.serviceType}`} className="text-xs text-muted-foreground">
                  {t("duration")}
                </Label>
                <Input
                  id={`dur-${s.serviceType}`}
                  type="number"
                  min={5}
                  step={5}
                  value={s.durationMinutes}
                  onChange={(e) => updateService(index, { durationMinutes: e.target.value })}
                  className="w-24"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {message && (
          <p className={message.kind === "ok" ? "text-sm text-muted-foreground" : "text-sm text-destructive"} role="status">
            {message.text}
          </p>
        )}
        <Button type="button" disabled={isPending} onClick={save}>
          {isPending ? t("saving") : t("save")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("blockedTitle")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("blockedDescription")}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ob-blocked-date">{t("blockedDate")}</Label>
              <Input id="ob-blocked-date" type="date" value={blockedDate} onChange={(e) => setBlockedDate(e.target.value)} className="w-44" />
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <Label htmlFor="ob-blocked-reason">{t("blockedReason")}</Label>
              <Input id="ob-blocked-reason" maxLength={200} value={blockedReason} onChange={(e) => setBlockedReason(e.target.value)} />
            </div>
            <Button type="button" variant="outline" disabled={isPending || !blockedDate} onClick={addBlocked}>
              {t("addBlocked")}
            </Button>
          </div>
          {blockedError && <p className="text-sm text-destructive">{blockedError}</p>}
          {config.blockedDates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noBlocked")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {config.blockedDates.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-sm text-foreground">
                    {b.date}
                    {b.reason && <span className="text-muted-foreground"> — {b.reason}</span>}
                  </span>
                  <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => removeBlocked(b.id)}>
                    <Trash2 className="h-4 w-4" />
                    {t("removeBlocked")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
