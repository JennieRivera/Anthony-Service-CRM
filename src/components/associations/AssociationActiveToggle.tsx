"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { toggleAssociationChamberActiveAction } from "@/app/[locale]/(app)/associations/actions";

export function AssociationActiveToggle({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const t = useTranslations("Associations");
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(() => toggleAssociationChamberActiveAction(id, !active))
      }
    >
      {active ? t("deactivate") : t("activate")}
    </Button>
  );
}
