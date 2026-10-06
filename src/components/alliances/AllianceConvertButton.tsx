"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { convertAllianceToActiveAction } from "@/app/[locale]/(app)/alliances/partner-actions";

// A Prospect another ally added → an active AMS ally (then it can get its
// own portal access).
export function AllianceConvertButton({ allianceId, size = "default" }: { allianceId: string; size?: "default" | "sm" }) {
  const t = useTranslations("AllyNetwork");
  return (
    <ConfirmDialog
      variant="default"
      trigger={<Button size={size}>{t("convert")}</Button>}
      title={t("convertConfirmTitle")}
      description={t("convertConfirmDescription")}
      confirmLabel={t("convert")}
      confirmingLabel={t("converting")}
      cancelLabel={t("cancel")}
      onConfirm={async () => {
        await convertAllianceToActiveAction(allianceId);
        toast.success(t("converted"));
      }}
    />
  );
}
