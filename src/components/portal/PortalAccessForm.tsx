"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { businessInfo } from "@/lib/business-info";

// Shared by the client portal and the partner portal: each passes its own
// sign-in endpoint, home page and texts.
export function PortalAccessForm({
  endpoint = "/api/portal/login",
  home = "/portal",
  namespace = "Portal.access",
}: {
  endpoint?: "/api/portal/login" | "/api/partners/login";
  home?: "/portal" | "/partners";
  namespace?: "Portal.access" | "Partners.access";
} = {}) {
  const t = useTranslations(namespace);
  const router = useRouter();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [lastFour, setLastFour] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The token lives after "#" so it never reaches any server log. Read it
  // once, then strip it from the address bar and browser history.
  useEffect(() => {
    const value = window.location.hash.slice(1);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the URL fragment
    setToken(/^[A-Za-z0-9_-]{43}$/.test(value) ? value : null);
    if (value) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!/^\d{4}$/.test(lastFour)) {
      setError(t("errors.format"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, lastFour }),
      });
      if (res.ok) {
        router.replace(home);
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(
        data.error === "locked"
          ? t("errors.locked", { phone: businessInfo.phone })
          : data.error === "rate_limited"
            ? t("errors.rateLimited")
            : t("errors.invalid"),
      );
      if (data.error === "locked") setToken(null);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  if (token === undefined) return null;

  if (token === null) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <p className="text-foreground">{t("noLink")}</p>
        <a href={`tel:${businessInfo.phone.replace(/\D/g, "")}`} className="text-sm text-primary underline">
          {t("callUs", { phone: businessInfo.phone })}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <p className="text-foreground">{t("intro")}</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lastFour">{t("lastFourLabel")}</Label>
        <Input
          id="lastFour"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={4}
          value={lastFour}
          onChange={(e) => setLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
          aria-invalid={!!error}
          className="h-12 w-32 text-center text-2xl tracking-[0.4em]"
        />
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" size="lg" className="h-12 text-base" disabled={submitting || lastFour.length !== 4}>
        {submitting ? t("checking") : t("continue")}
      </Button>
    </form>
  );
}
