"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteClientAction } from "@/app/[locale]/(app)/clients/actions";

type Impact = { cases: number; appointments: number; documents: number; referrals: number; openTasks: number };

export function ClientDeleteButton({
  clientId,
  impact,
}: {
  clientId: string;
  // What deleting takes with it (see getClientDeletionImpact).
  impact?: Impact;
}) {
  const t = useTranslations("Clients");

  // Built from small messages so every count reads right, and only the
  // things the client actually has are listed.
  function impactText(i: Impact) {
    const items = [
      i.cases > 0 ? t("deleteImpact.cases", { count: i.cases }) : null,
      i.appointments > 0 ? t("deleteImpact.appointments", { count: i.appointments }) : null,
      i.documents > 0 ? t("deleteImpact.documents", { count: i.documents }) : null,
      i.referrals > 0 ? t("deleteImpact.referrals", { count: i.referrals }) : null,
      i.openTasks > 0 ? t("deleteImpact.tasks", { count: i.openTasks }) : null,
    ].filter((x): x is string => x !== null);
    return [
      t("deleteImpact.intro"),
      items.length > 0 ? t("deleteImpact.alsoDeleted", { items: items.join(", ") }) : null,
      t("deleteImpact.noUndo"),
    ]
      .filter(Boolean)
      .join(" ");
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive">
          <Trash2 className="h-4 w-4" />
          {t("deleteClient")}
        </Button>
      }
      title={t("deleteConfirmTitle")}
      description={impact ? impactText(impact) : t("deleteConfirmDescription")}
      confirmLabel={t("deleteClient")}
      confirmingLabel={t("deleting")}
      cancelLabel={t("deleteConfirmDismiss")}
      onConfirm={async () => {
        const result = await deleteClientAction(clientId);
        if (!result.ok) {
          toast.error(
            result.reason === "billing"
              ? t("deleteBlockedByBilling")
              : result.reason === "compensation"
                ? t("deleteBlockedByCompensation")
                : t("deleteBlockedLinked"),
          );
        }
      }}
    />
  );
}
