"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Clock, Phone, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { publicBookingSchema } from "@/lib/validation/onlineBooking";
import type { PublicBookingService, PublicBookingSummary } from "@/lib/booking/server";
import type { DayAvailability } from "@/lib/booking/slots";

// Public /book flow: service → day → time → details → confirmation.
// Talks only to /api/public/booking/* — no Server Actions (proxy.ts
// refuses Server Action calls on public pages by design).

const detailsSchema = publicBookingSchema.pick({
  fullName: true,
  phone: true,
  email: true,
  comment: true,
  preferredLanguage: true,
  consent: true,
  legalAck: true,
  website: true,
});

type DetailsValues = {
  fullName: string;
  phone: string;
  email: string;
  comment: string;
  preferredLanguage: "en" | "es";
  consent: boolean;
  legalAck: boolean;
  website: string;
};

type Availability =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; days: DayAvailability[] };

// Dates/times arrive as Florida wall-clock strings ("2026-10-05",
// "09:30"); they're formatted as-is via a fixed UTC instant so the
// visitor's own device timezone can never shift them.
function wallClock(date: string, time = "12:00") {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h, min));
}

function formatDayChip(date: string, locale: string) {
  const value = wallClock(date);
  return {
    weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(value),
    day: new Intl.DateTimeFormat(locale, { day: "numeric", timeZone: "UTC" }).format(value),
    month: new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(value),
  };
}

// Always 12-hour "1:00 PM", in both languages — what US clients expect
// (Spanish's default 24-hour "13:00" read as confusing). Display only:
// the API keeps "HH:mm".
function formatTime(time: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(wallClock("2000-01-01", time));
}

function formatLongDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(wallClock(date));
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>;
}

// Services whose page shows the "not a law firm" notice prominently.
const LEGAL_NOTICE_SERVICES = new Set(["immigration", "notary", "online_notary"]);
const NOTARY_SERVICES = new Set(["notary", "online_notary"]);

export type BookingLegalTexts = {
  notALawFirm: string;
  acknowledgment: string;
  floridaNotaryDisclosure: string;
};

export function BookingFlow({
  services,
  locale,
  legal,
  prefill,
  initialService,
}: {
  services: PublicBookingService[];
  locale: "en" | "es";
  legal: BookingLegalTexts;
  // A signed-in client-portal visitor's own contact details, read from
  // their portal session server-side (never from the URL).
  prefill?: { fullName: string; phone: string; email: string } | null;
  initialService?: string | null;
}) {
  const t = useTranslations("Book");
  // Public-facing names: never "notario" / "consultor de inmigración".
  const tService = useTranslations("PublicServiceType");

  const [serviceType, setServiceType] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Availability>({ state: "idle" });
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PublicBookingSummary | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);

  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema) as never,
    defaultValues: {
      fullName: prefill?.fullName ?? "",
      phone: prefill?.phone ?? "",
      email: prefill?.email ?? "",
      comment: "",
      preferredLanguage: locale,
      consent: false,
      legalAck: false,
      website: "",
    },
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const loadAvailability = useCallback(async (service: string, keepDate?: string | null) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAvailability({ state: "loading" });
    try {
      const res = await fetch(
        `/api/public/booking/availability?service=${encodeURIComponent(service)}`,
        { signal: controller.signal, cache: "no-store" },
      );
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { days: DayAvailability[] };
      const days = data.days.filter((d) => d.slots.length > 0);
      setAvailability({ state: "ready", days });
      setDate((current) => {
        const wanted = keepDate ?? current;
        return wanted && days.some((d) => d.date === wanted) ? wanted : (days[0]?.date ?? null);
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") setAvailability({ state: "error" });
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  // /book?service=… (e.g. from the client portal) preselects a service,
  // only if it is actually bookable online.
  useEffect(() => {
    if (initialService && services.some((s) => s.serviceType === initialService)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time preselection from the URL
      setServiceType(initialService);
      void loadAvailability(initialService);
    }
  }, [initialService, services, loadAvailability]);

  function chooseService(next: string) {
    setServiceType(next);
    setTime(null);
    setDate(null);
    setSubmitError(null);
    void loadAvailability(next);
  }

  function chooseTime(next: string) {
    setTime(next);
    setSubmitError(null);
    requestAnimationFrame(() =>
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  async function submitDetails(values: DetailsValues) {
    if (!serviceType || !date || !time) {
      setSubmitError(t("errors.slot"));
      return;
    }
    setSubmitError(null);
    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, serviceType, date, time, locale }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        summary?: PublicBookingSummary;
        fields?: string[];
      };
      if (data.status === "ok" && data.summary) {
        setSummary(data.summary);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (data.status === "slot_taken") {
        setTime(null);
        setSubmitError(t("errors.slotTaken"));
        void loadAvailability(serviceType, date);
        return;
      }
      if (data.status === "rate_limited") return setSubmitError(t("errors.rateLimited"));
      if (data.status === "unavailable") return setSubmitError(t("errors.unavailable"));
      setSubmitError(t("errors.generic"));
    } catch {
      setSubmitError(t("errors.generic"));
    }
  }

  function startOver() {
    setSummary(null);
    setServiceType(null);
    setDate(null);
    setTime(null);
    setAvailability({ state: "idle" });
    form.reset();
  }

  const fieldError = (name: keyof DetailsValues) => {
    const message = errors[name]?.message;
    if (!message) return null;
    return (
      <p className="text-sm text-destructive" role="alert">
        {t(`errors.${message}` as "errors.generic")}
      </p>
    );
  };

  if (summary) {
    const rows = (
      [
        [t("summaryService"), tService(summary.serviceType)],
        [t("summaryWhen"), `${formatLongDate(summary.date, locale)} · ${formatTime(summary.time)}`],
        [t("summaryDuration"), t("minutes", { count: summary.durationMinutes })],
        [t("summaryType"), t("phoneAppointment")],
        [t("summaryName"), summary.fullName],
        [t("summaryPhone"), summary.phone],
        [t("summaryEmail"), summary.email],
        [t("summaryLanguage"), summary.preferredLanguage === "es" ? t("languageEs") : t("languageEn")],
      ] as [string, string][]
    ).filter(([, value]) => value !== "");
    return (
      <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6" aria-live="polite">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-7 shrink-0 text-primary" aria-hidden />
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-xl text-foreground">{t("confirmTitle")}</h2>
            <p className="text-foreground">{t("confirmMessage")}</p>
          </div>
        </div>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="mb-2 break-words font-medium text-foreground sm:mb-0">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">{t("allTimesNote")}</p>
        <Button type="button" variant="outline" className="self-start" onClick={startOver}>
          {t("bookAnother")}
        </Button>
      </section>
    );
  }

  const readyDays = availability.state === "ready" ? availability.days : [];
  const selectedDay = readyDays.find((d) => d.date === date);

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Service */}
      <section className="flex flex-col gap-3">
        <StepTitle>{t("stepService")}</StepTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {services.map((s) => {
            const selected = s.serviceType === serviceType;
            return (
              <button
                key={s.serviceType}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseService(s.serviceType)}
                className={cn(
                  "flex min-h-14 items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected
                    ? "border-primary ring-2 ring-primary"
                    : "border-border hover:border-primary/60",
                )}
              >
                <span className="font-medium text-foreground">{tService(s.serviceType)}</span>
                <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="size-4" aria-hidden />
                  {t("minutes", { count: s.durationMinutes })}
                </span>
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="size-4" aria-hidden />
          {t("phoneAppointment")} · {t("allTimesNote")}
        </p>
        {serviceType && LEGAL_NOTICE_SERVICES.has(serviceType) && (
          <div className="flex flex-col gap-2 rounded-xl border-2 border-primary/50 bg-card p-4 text-sm text-foreground" role="note">
            <p className="flex items-start gap-2 font-medium">
              <Scale className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{legal.notALawFirm}</span>
            </p>
            {NOTARY_SERVICES.has(serviceType) && legal.floridaNotaryDisclosure && (
              <p className="whitespace-pre-line">{legal.floridaNotaryDisclosure}</p>
            )}
          </div>
        )}
      </section>

      {/* 2 + 3. Day and time */}
      {serviceType && (
        <section className="flex flex-col gap-3">
          <StepTitle>{t("stepDate")}</StepTitle>
          {availability.state === "loading" && (
            <p className="text-sm text-muted-foreground" aria-live="polite">{t("loadingTimes")}</p>
          )}
          {availability.state === "error" && (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-destructive">{t("loadError")}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => loadAvailability(serviceType)}>
                {t("retry")}
              </Button>
            </div>
          )}
          {availability.state === "ready" && readyDays.length === 0 && (
            <p className="rounded-xl border border-border bg-card p-4 text-sm text-foreground">{t("noTimesAtAll")}</p>
          )}
          {readyDays.length > 0 && (
            <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2">
              {readyDays.map((d) => {
                const chip = formatDayChip(d.date, locale);
                const selected = d.date === date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    aria-pressed={selected}
                    aria-label={formatLongDate(d.date, locale)}
                    onClick={() => {
                      setDate(d.date);
                      setTime(null);
                    }}
                    className={cn(
                      "flex w-16 shrink-0 snap-start flex-col items-center rounded-xl border px-2 py-2 transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-primary/60",
                    )}
                  >
                    <span className="text-xs uppercase">{chip.weekday}</span>
                    <span className="text-xl font-semibold leading-tight">{chip.day}</span>
                    <span className="text-xs">{chip.month}</span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedDay && (
            <>
              <StepTitle>{t("stepTime")}</StepTitle>
              <p className="text-sm text-muted-foreground">{formatLongDate(selectedDay.date, locale)}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {selectedDay.slots.map((slot) => {
                  const selected = slot === time;
                  return (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => chooseTime(slot)}
                      className={cn(
                        "min-h-11 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/60",
                      )}
                    >
                      {formatTime(slot)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {submitError && !time && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
          {submitError}
        </p>
      )}

      {/* 4. Details */}
      {serviceType && date && time && (
        <section ref={detailsRef} className="flex scroll-mt-4 flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-1">
            <StepTitle>{t("stepDetails")}</StepTitle>
            <p className="text-sm text-muted-foreground">
              {tService(serviceType)} · {formatLongDate(date, locale)} · {formatTime(time)}
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(submitDetails)(e)} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">{t("fullName")}</Label>
              <Input id="fullName" autoComplete="name" maxLength={100} aria-invalid={!!errors.fullName} className="h-11 text-base" {...register("fullName")} />
              {fieldError("fullName")}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} aria-invalid={!!errors.phone} aria-describedby="phone-hint" className="h-11 text-base" {...register("phone")} />
              <p id="phone-hint" className="text-xs text-muted-foreground">{t("phoneHint")}</p>
              {fieldError("phone")}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" inputMode="email" autoComplete="email" maxLength={254} aria-invalid={!!errors.email} className="h-11 text-base" {...register("email")} />
              {fieldError("email")}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="comment">{t("comment")}</Label>
              <Textarea id="comment" rows={3} maxLength={1000} placeholder={t("commentPlaceholder")} aria-invalid={!!errors.comment} className="text-base" {...register("comment")} />
              {fieldError("comment")}
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-foreground">{t("preferredLanguage")}</legend>
              <Controller
                control={control}
                name="preferredLanguage"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    {(["es", "en"] as const).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        aria-pressed={field.value === lang}
                        onClick={() => field.onChange(lang)}
                        className={cn(
                          "min-h-11 rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                          field.value === lang
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:border-primary/60",
                        )}
                      >
                        {lang === "es" ? t("languageEs") : t("languageEn")}
                      </button>
                    ))}
                  </div>
                )}
              />
            </fieldset>

            {/* Honeypot — hidden from people and assistive tech; bots fill it. */}
            <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
              <label htmlFor="website">Website</label>
              <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="consent"
                render={({ field }) => (
                  <label htmlFor="consent" className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
                    <Checkbox
                      id="consent"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      aria-invalid={!!errors.consent}
                      className="mt-0.5 size-5"
                    />
                    <span>{t("consent")}</span>
                  </label>
                )}
              />
              {fieldError("consent")}
            </div>

            <div className="flex flex-col gap-1.5">
              <Controller
                control={control}
                name="legalAck"
                render={({ field }) => (
                  <label htmlFor="legalAck" className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
                    <Checkbox
                      id="legalAck"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      aria-invalid={!!errors.legalAck}
                      className="mt-0.5 size-5"
                    />
                    <span>{legal.acknowledgment}</span>
                  </label>
                )}
              />
              {fieldError("legalAck")}
            </div>

            {submitError && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}

            <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={isSubmitting}>
              {isSubmitting ? t("submitting") : t("submit")}
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
