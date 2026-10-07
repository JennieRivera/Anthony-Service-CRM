"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { approveConectaAllianceAction } from "@/app/[locale]/(app)/alliances/partner-actions";

// Diamante Conecta 360: approve an application → active ally, "Sign in
// with my email" on, and a welcome email with how to sign in.
export function AllianceApproveButton({ allianceId, hasEmail }: { allianceId: string; hasEmail: boolean }) {
  const t = useTranslations("Conecta.staff");
  return (
    <ConfirmDialog
      variant="default"
      trigger={<Button>{t("approve")}</Button>}
      title={t("approveTitle")}
      description={hasEmail ? t("approveDescription") : t("approveDescriptionNoEmail")}
      confirmLabel={t("approve")}
      confirmingLabel={t("approving")}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        const result = await approveConectaAllianceAction(allianceId);
        if (!result.ok) toast.error(t("error"));
        else toast.success(result.emailed ? t("approvedEmailed") : t("approvedNoEmail"));
      }}
    />
  );
}
