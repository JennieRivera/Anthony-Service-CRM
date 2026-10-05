"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarPlus, CheckCircle2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PORTAL_SERVICE_COMMENT_MAX } from "@/lib/validation/portalProfile";
import type { ServiceType } from "@/lib/booking/config";

// Services that interest me: the client ticks services and/or writes a
// comment; staff get a task to call them. Services already on the
// client's record show as "On your list" and stay ticked.
export function PortalServicesForm({
  services,
  interested,
  bookable,
}: {
  services: ServiceType[];
  interested: ServiceType[];
  bookable: ServiceType[];
}) {
  const t = useTranslations("Portal.services");
  const tService = useTranslations("PublicServiceType");
  const router = useRouter();
  const [selected, setSelected] = useState<ServiceType[]>([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "sent" } | { kind: "error"; message: string }>({ kind: "idle" });

  function toggle(service: ServiceType, on: boolean) {
    setSelected((s) => (on ? [...s, service] : s.filter((x) => x !== service)));
    setStatus({ kind: "idle" });
  }

  async function submit() {
    if (selected.length === 0 && comment.trim() === "") {
      setStatus({ kind: "error", message: t("errors.empty") });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/portal/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services: selected, comment }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus({ kind: "error", message: data.error === "limit_reached" ? t("errors.limit") : t("errors.generic") });
        return;
      }
      setSelected([]);
      setComment("");
      setStatus({ kind: "sent" });
      router.refresh();
    } catch {
      setStatus({ kind: "error", message: t("errors.generic") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {services.map((service) => {
          const already = interested.includes(service);
          const id = `service-${service}`;
          return (
            <li key={service} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  id={id}
                  className="mt-0.5 size-5"
                  checked={already || selected.includes(service)}
                  disabled={already}
                  onCheckedChange={(v) => toggle(service, v === true)}
                />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-medium text-foreground">{tService(service)}</span>
                  <span className="text-sm text-muted-foreground">{t(`descriptions.${service}`)}</span>
                  {already && (
                    <span className="self-start rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                      {t("onYourList")}
                    </span>
                  )}
                </span>
              </label>
              {bookable.includes(service) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  nativeButton={false}
                  render={<Link href={{ pathname: "/book", query: { service } }} />}
                >
                  <CalendarPlus className="size-4" aria-hidden />
                  {t("bookThis")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="services-comment">{t("commentLabel")}</Label>
          <Textarea
            id="services-comment"
            rows={3}
            maxLength={PORTAL_SERVICE_COMMENT_MAX}
            placeholder={t("commentPlaceholder")}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setStatus({ kind: "idle" });
            }}
            className="text-base"
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("note")}</p>
        {status.kind === "sent" && (
          <p className="flex items-start gap-2 text-sm text-foreground" role="status">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {t("sent")}
          </p>
        )}
        {status.kind === "error" && (
          <p className="text-sm text-destructive" role="alert">
            {status.message}
          </p>
        )}
        <Button type="button" size="lg" className="h-12 text-base" disabled={busy} onClick={submit}>
          {busy ? t("sending") : t("send")}
        </Button>
      </div>
    </div>
  );
}
