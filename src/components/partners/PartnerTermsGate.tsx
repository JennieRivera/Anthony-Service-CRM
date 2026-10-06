"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Handshake } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

// First sign-in: the alliance must accept the alliance terms and the "not
// a law firm" notice. Recorded with date/time, IP and browser by
// /api/partners/acknowledge.
export function PartnerTermsGate({ terms, notice, noticeLabel }: { terms: string; notice: string; noticeLabel: string }) {
  const t = useTranslations("Partners.gate");
  const locale = useLocale();
  const router = useRouter();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedNotice, setAcceptedNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/partners/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptedTerms: true, acceptedNotice: true, locale }),
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
        <Handshake className="mt-1 size-6 shrink-0 text-primary" aria-hidden />
        <h1 className="font-heading text-xl text-foreground">{t("title")}</h1>
      </div>
      <div className="max-h-80 overflow-y-auto rounded-md border border-border bg-secondary/30 p-4 text-sm whitespace-pre-line text-foreground">
        {terms}
      </div>
      <label htmlFor="partner-terms" className="flex cursor-pointer items-start gap-3 text-foreground">
        <Checkbox id="partner-terms" checked={acceptedTerms} onCheckedChange={(v) => setAcceptedTerms(v === true)} className="mt-0.5 size-5" />
        <span>{t("acceptTerms")}</span>
      </label>
      <p className="text-sm text-muted-foreground">{notice}</p>
      <label htmlFor="partner-notice" className="flex cursor-pointer items-start gap-3 text-foreground">
        <Checkbox id="partner-notice" checked={acceptedNotice} onCheckedChange={(v) => setAcceptedNotice(v === true)} className="mt-0.5 size-5" />
        <span>{noticeLabel}</span>
      </label>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="button" size="lg" className="h-12 text-base" disabled={!acceptedTerms || !acceptedNotice || submitting} onClick={accept}>
        {t("continue")}
      </Button>
    </section>
  );
}
