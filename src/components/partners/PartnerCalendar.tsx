"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, CalendarPlus, CheckCircle2, MapPin } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatTime } from "@/lib/dates";
import type { PartnerMeeting, PartnerReferralAppointment } from "@/lib/partners/calendar";

const MODES = ["in_person", "phone", "video"] as const;

export function PartnerCalendar({
  upcoming,
  past,
  referralAppointments,
}: {
  upcoming: PartnerMeeting[];
  past: PartnerMeeting[];
  referralAppointments: PartnerReferralAppointment[];
}) {
  const t = useTranslations("Partners.calendar");
  const tType = useTranslations("AppointmentType");
  const tStatus = useTranslations("AppointmentStatus");
  const tService = useTranslations("PublicServiceType");
  const locale = useLocale();

  const meetingItem = (m: PartnerMeeting) => (
    <li key={m.id} className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-foreground">{m.title}</span>
        <Badge variant="outline">{tStatus(m.status)}</Badge>
      </div>
      <span className="flex items-center gap-2 text-sm text-foreground">
        <CalendarDays className="size-4 text-primary" aria-hidden />
        {formatDate(m.startAt, locale)} · {formatTime(m.startAt, locale)}–{formatTime(m.endAt, locale)} · {tType(m.appointmentType)}
      </span>
      {m.location && (
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-4" aria-hidden />
          {m.location}
        </span>
      )}
    </li>
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-foreground">{t("meetingsTitle")}</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">{t("noMeetings")}</p>
        ) : (
          <ul className="flex flex-col gap-3">{upcoming.map(meetingItem)}</ul>
        )}
      </section>

      <RequestMeetingForm />

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-foreground">{t("referralsTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("referralsHint")}</p>
        {referralAppointments.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">{t("noReferralAppointments")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
            {referralAppointments.map((a, i) => (
              <li key={`${a.startAt}-${i}`} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span className="text-foreground">{formatDate(a.startAt, locale)}</span>
                <span className="text-muted-foreground">{tService(a.serviceType)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg text-foreground">{t("pastTitle")}</h2>
          <ul className="flex flex-col gap-3">{past.map(meetingItem)}</ul>
        </section>
      )}
    </div>
  );
}

function RequestMeetingForm() {
  const t = useTranslations("Partners.calendar");
  const router = useRouter();
  const empty = { topic: "", preferred: "", note: "", mode: "in_person" as (typeof MODES)[number] };
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const set = (k: "topic" | "preferred" | "note") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/partners/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting: form }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ kind: "error", text: t.has(`errors.${data.error}`) ? t(`errors.${data.error}`) : t("errors.generic") });
        return;
      }
      setForm(empty);
      setOpen(false);
      setMessage({ kind: "ok", text: t("requested") });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: t("errors.generic") });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      {!open ? (
        <Button type="button" size="lg" className="h-12 w-full text-base sm:w-fit" onClick={() => setOpen(true)}>
          <CalendarPlus className="size-5" aria-hidden />
          {t("request")}
        </Button>
      ) : (
        <form onSubmit={send} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="font-heading text-lg text-foreground">{t("request")}</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-topic">{t("fields.topic")}</Label>
            <Input id="m-topic" value={form.topic} onChange={set("topic")} maxLength={300} className="h-11" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-preferred">{t("fields.preferred")}</Label>
            <Input id="m-preferred" value={form.preferred} onChange={set("preferred")} maxLength={300} placeholder={t("fields.preferredPlaceholder")} className="h-11" />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">{t("fields.mode")}</legend>
            <div className="flex flex-wrap gap-2">
              {MODES.map((m) => (
                <label key={m} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground has-[:checked]:border-primary">
                  <input type="radio" name="m-mode" value={m} checked={form.mode === m} onChange={() => setForm((f) => ({ ...f, mode: m }))} className="size-4 accent-primary" />
                  {t(`modes.${m}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m-note">{t("fields.note")}</Label>
            <Textarea id="m-note" rows={2} maxLength={1000} value={form.note} onChange={set("note")} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" className="h-12 text-base" disabled={sending}>
              {sending ? t("sending") : t("send")}
            </Button>
            <Button type="button" variant="outline" size="lg" className="h-12 text-base" disabled={sending} onClick={() => setOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}
      {message && (
        <p className={message.kind === "ok" ? "flex items-center gap-2 text-sm text-foreground" : "text-sm text-destructive"} role={message.kind === "ok" ? "status" : "alert"}>
          {message.kind === "ok" && <CheckCircle2 className="size-4 text-primary" aria-hidden />}
          {message.text}
        </p>
      )}
    </section>
  );
}
