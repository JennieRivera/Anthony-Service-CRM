"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Checkbox } from "@/components/ui/checkbox";

// Shown only once AMS marked this ally for the network directory: the ally
// itself decides whether it appears there (stored with date and IP).
export function PartnerDirectoryOptIn({ optIn }: { optIn: boolean }) {
  const t = useTranslations("Partners.directoryOptIn");
  const router = useRouter();
  const [checked, setChecked] = useState(optIn);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function change(next: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/partners/directory-listing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: next, textShown: t("text") }),
      });
      if (!res.ok) throw new Error();
      setChecked(next);
      setMessage({ kind: "ok", text: t("saved") });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: t("error") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
      <label htmlFor="directory-opt-in" className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
        <Checkbox id="directory-opt-in" checked={checked} disabled={busy} onCheckedChange={(v) => change(v === true)} className="mt-0.5 size-5" />
        <span>{t("text")}</span>
      </label>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <p className="text-sm font-medium text-foreground">{checked ? t("on") : t("off")}</p>
      {message && (
        <p className={message.kind === "ok" ? "text-sm text-foreground" : "text-sm text-destructive"} role={message.kind === "ok" ? "status" : "alert"}>
          {message.text}
        </p>
      )}
    </section>
  );
}
