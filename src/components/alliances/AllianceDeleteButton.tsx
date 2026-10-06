"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteAllianceAction } from "@/app/[locale]/(app)/alliances/partner-actions";

type Impact = { documents: number; photos: number; referrals: number; addedClients: number };

// Admin only (the page decides). The dialog says what is deleted, what is
// kept, and suggests archiving a real ally instead.
export function AllianceDeleteButton({ allianceId, impact }: { allianceId: string; impact: Impact }) {
  const t = useTranslations("Alliances.delete");

  const kept = [
    impact.addedClients > 0 ? t("keptClients", { count: impact.addedClients }) : null,
    impact.referrals > 0 ? t("keptReferrals", { count: impact.referrals }) : null,
    t("keptConsents"),
  ].filter((x): x is string => x !== null);
  const description = [
    t("deleted", { documents: impact.documents, photos: impact.photos }),
    t("kept", { items: kept.join(", ") }),
    t("archiveHint"),
    t("noUndo"),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive">
          <Trash2 className="h-4 w-4" />
          {t("button")}
        </Button>
      }
      title={t("title")}
      description={description}
      confirmLabel={t("button")}
      confirmingLabel={t("deleting")}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        const result = await deleteAllianceAction(allianceId);
        if (!result.ok) {
          toast.error(result.reason === "membership_billing" ? t("blockedBilling") : t("blockedLinked"));
        }
      }}
    />
  );
}
