"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setAllianceDirectoryFlagsAction } from "@/app/[locale]/(app)/alliances/partner-actions";

// Option B (direct referrals between allies) — both off by default.
export function AllianceDirectorySwitches({
  allianceId,
  directoryAccess,
  directoryListed,
  directoryOptIn,
  canEdit,
}: {
  allianceId: string;
  directoryAccess: boolean;
  directoryListed: boolean;
  directoryOptIn: boolean;
  canEdit: boolean;
}) {
  const t = useTranslations("PartnerDirectoryFlags");
  const [flags, setFlags] = useState({ directoryAccess, directoryListed });
  const [pending, startTransition] = useTransition();

  function change(key: keyof typeof flags, value: boolean) {
    const next = { ...flags, [key]: value };
    setFlags(next);
    startTransition(async () => {
      await setAllianceDirectoryFlagsAction(allianceId, next);
      toast.success(t("saved"));
    });
  }

  const row = (key: keyof typeof flags, label: string, hint: string) => (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={`dir-${key}`} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <Switch id={`dir-${key}`} checked={flags[key]} disabled={!canEdit || pending} onCheckedChange={(v) => change(key, v === true)} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
      </div>
      {row("directoryAccess", t("access"), t("accessHint"))}
      {row("directoryListed", t("listed"), t("listedHint"))}
      {flags.directoryListed && (
        <p className="text-sm text-foreground">{directoryOptIn ? t("optedIn") : t("notOptedIn")}</p>
      )}
    </div>
  );
}
