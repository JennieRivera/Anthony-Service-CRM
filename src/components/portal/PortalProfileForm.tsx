"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  bestTimeToCallValues,
  portalProfileSchema,
  type PortalProfileValues,
} from "@/lib/validation/portalProfile";

const selectClass = "h-11 rounded-lg border border-input bg-card px-3 text-base text-foreground";

// My profile — the client's own contact details. The full name is shown
// but can only be changed by staff in the CRM.
export function PortalProfileForm({ fullName, defaults }: { fullName: string; defaults: PortalProfileValues }) {
  const t = useTranslations("Portal.profile");
  const router = useRouter();
  const [status, setStatus] = useState<{ kind: "idle" | "saved" | "unchanged" } | { kind: "error"; message: string }>({
    kind: "idle",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PortalProfileValues>({ resolver: zodResolver(portalProfileSchema), defaultValues: defaults });

  const fieldError = (message: string | undefined) =>
    message ? (
      <p className="text-sm text-destructive" role="alert">
        {t(`errors.${message}` as "errors.phone")}
      </p>
    ) : null;

  async function submit(values: PortalProfileValues) {
    setStatus({ kind: "idle" });
    try {
      const res = await fetch("/api/portal/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { changed?: string[]; error?: string };
      if (!res.ok) {
        const known = ["phone", "email", "address", "language", "limit_reached"];
        setStatus({ kind: "error", message: t(`errors.${known.includes(data.error ?? "") ? data.error : "generic"}` as "errors.generic") });
        return;
      }
      setStatus({ kind: data.changed?.length ? "saved" : "unchanged" });
      reset(values);
      router.refresh();
    } catch {
      setStatus({ kind: "error", message: t("errors.generic") });
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5" noValidate>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-muted-foreground">{t("fullName")}</span>
        <span className="text-base font-medium text-foreground">{fullName}</span>
        <span className="text-xs text-muted-foreground">{t("fullNameHelp")}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-phone">{t("phone")}</Label>
        <Input id="profile-phone" type="tel" inputMode="tel" autoComplete="tel" className="h-11 text-base" {...register("phone")} />
        {fieldError(errors.phone?.message)}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-email">{t("email")}</Label>
        <Input id="profile-email" type="email" inputMode="email" autoComplete="email" className="h-11 text-base" {...register("email")} />
        {fieldError(errors.email?.message)}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="profile-address">{t("address")}</Label>
        <Textarea id="profile-address" rows={2} autoComplete="street-address" maxLength={300} className="text-base" {...register("address")} />
        {fieldError(errors.address?.message)}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-language">{t("language")}</Label>
          <select id="profile-language" className={selectClass} {...register("preferredLanguage")}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profile-best-time">{t("bestTime")}</Label>
          <select id="profile-best-time" className={selectClass} {...register("bestTimeToCall")}>
            <option value="">{t("bestTimeAny")}</option>
            {bestTimeToCallValues.map((v) => (
              <option key={v} value={v}>
                {t(`bestTimes.${v}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{t("reviewNote")}</p>

      {status.kind === "saved" && (
        <p className="flex items-start gap-2 text-sm text-foreground" role="status">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          {t("saved")}
        </p>
      )}
      {status.kind === "unchanged" && (
        <p className="text-sm text-muted-foreground" role="status">
          {t("unchanged")}
        </p>
      )}
      {status.kind === "error" && (
        <p className="text-sm text-destructive" role="alert">
          {status.message}
        </p>
      )}

      <Button type="submit" size="lg" className="h-12 text-base" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
