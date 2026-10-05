"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { setDocumentClientVisibilityAction } from "@/app/[locale]/(app)/documents/actions";

// "Visible to client" switch on a staff document (default off). A client's
// own uploads are always visible to them, so they get a fixed label.
export function ClientVisibilityToggle({
  documentId,
  visible,
  uploadedByClient,
}: {
  documentId: string;
  visible: boolean;
  uploadedByClient: boolean;
}) {
  const t = useTranslations("Documents");
  const [checked, setChecked] = useState(visible);
  const [isPending, startTransition] = useTransition();

  if (uploadedByClient) return null;

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <Switch
        checked={checked}
        disabled={isPending}
        onCheckedChange={(next) => {
          setChecked(next);
          startTransition(async () => {
            try {
              await setDocumentClientVisibilityAction(documentId, next);
            } catch {
              setChecked(!next);
            }
          });
        }}
      />
      {t("visibleToClient")}
    </label>
  );
}
