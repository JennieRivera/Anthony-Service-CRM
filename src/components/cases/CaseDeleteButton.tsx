"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteCaseAction } from "@/app/[locale]/(app)/cases/actions";

export function CaseDeleteButton({
  caseId,
  impact,
}: {
  caseId: string;
  // What deleting touches (see getCaseDeletionImpact): open tasks go with
  // the case; documents and appointments stay on the client's record.
  impact?: { openTasks: number; documents: number; appointments: number };
}) {
  const t = useTranslations("Cases");

  // Built from small messages so every count reads right ("1 documento y
  // 2 citas…", or no sentence at all when there's nothing to keep).
  function impactText(i: { openTasks: number; documents: number; appointments: number }) {
    const kept = [
      i.documents > 0 ? t("deleteImpact.documents", { count: i.documents }) : null,
      i.appointments > 0 ? t("deleteImpact.appointments", { count: i.appointments }) : null,
    ].filter((x): x is string => x !== null);
    return [
      t("deleteImpact.intro"),
      t("deleteImpact.tasks", { count: i.openTasks }),
      kept.length > 0 ? t("deleteImpact.keep", { items: kept.join(` ${t("deleteImpact.and")} `) }) : null,
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
          {t("deleteCase")}
        </Button>
      }
      title={t("deleteConfirmTitle")}
      description={impact ? impactText(impact) : t("deleteConfirmDescription")}
      confirmLabel={t("deleteCase")}
      confirmingLabel={t("deleting")}
      cancelLabel={t("deleteConfirmDismiss")}
      onConfirm={() => deleteCaseAction(caseId)}
    />
  );
}
