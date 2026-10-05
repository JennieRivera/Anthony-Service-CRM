"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Scale } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

// Mandatory first-visit acknowledgment: "I understand Anthony Multiservice
// is not a law firm and does not give me legal advice." Recorded with
// date/time, IP and browser by /api/portal/acknowledge.
export function NotALawFirmGate({ notice, checkboxLabel }: { notice: string; checkboxLabel: string }) {
  const t = useTranslations("Portal.gate");
  const locale = useLocale();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true, locale }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.refresh();
    } catch {
      setError(t("error"));
      setSubmitting(false);
    }
  }

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <Scale className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-xl text-foreground">{t("title")}</h1>
          <p className="text-foreground">{notice}</p>
        </div>
      </div>
      <label htmlFor="not-a-law-firm" className="flex cursor-pointer items-start gap-3 text-foreground">
        <Checkbox
          id="not-a-law-firm"
          checked={checked}
          onCheckedChange={(v) => setChecked(v === true)}
          className="mt-0.5 size-5"
        />
        <span>{checkboxLabel}</span>
      </label>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="button" size="lg" className="h-12 text-base" disabled={!checked || submitting} onClick={accept}>
        {t("continue")}
      </Button>
    </section>
  );
}
