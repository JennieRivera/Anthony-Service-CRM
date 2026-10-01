"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteClientAction } from "@/app/[locale]/(app)/clients/actions";

export function ClientDeleteButton({ clientId }: { clientId: string }) {
  const t = useTranslations("Clients");

  return (
    <ConfirmDialog
      trigger={
        <Button variant="destructive">
          <Trash2 className="h-4 w-4" />
          {t("deleteClient")}
        </Button>
      }
      title={t("deleteConfirmTitle")}
      description={t("deleteConfirmDescription")}
      confirmLabel={t("deleteClient")}
      confirmingLabel={t("deleting")}
      cancelLabel={t("deleteConfirmDismiss")}
      onConfirm={async () => {
        const result = await deleteClientAction(clientId);
        if (!result.ok) {
          toast.error(t("deleteBlockedByBilling"));
        }
      }}
    />
  );
}
