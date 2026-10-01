"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteCaseAction } from "@/app/[locale]/(app)/cases/actions";

export function CaseDeleteButton({ caseId }: { caseId: string }) {
  const t = useTranslations("Cases");

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive">
          <Trash2 className="h-4 w-4" />
          {t("deleteCase")}
        </Button>
      }
      title={t("deleteConfirmTitle")}
      description={t("deleteConfirmDescription")}
      confirmLabel={t("deleteCase")}
      confirmingLabel={t("deleting")}
      cancelLabel={t("deleteConfirmDismiss")}
      onConfirm={() => deleteCaseAction(caseId)}
    />
  );
}
