"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { setAllianceDocumentPartnerVisibilityAction } from "@/app/[locale]/(app)/alliances/partner-actions";

// "Visible to the partner" on an alliance document. A document the partner
// uploaded itself is always visible to it (no checkbox).
export function PartnerDocumentVisibility({
  documentId,
  visible,
  uploadedByPartner,
}: {
  documentId: string;
  visible: boolean;
  uploadedByPartner: boolean;
}) {
  const t = useTranslations("PartnerAccess");
  const [checked, setChecked] = useState(visible);
  const [isPending, startTransition] = useTransition();

  if (uploadedByPartner) return <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-foreground">{t("uploadedByPartner")}</span>;
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
      <Checkbox
        checked={checked}
        disabled={isPending}
        onCheckedChange={(v) => {
          const next = v === true;
          setChecked(next);
          startTransition(() => setAllianceDocumentPartnerVisibilityAction(documentId, next));
        }}
      />
      {t("visibleToPartner")}
    </label>
  );
}
