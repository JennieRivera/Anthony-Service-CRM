"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { allianceDocumentTypeValues } from "@/lib/validation/allianceDocument";
import { updateAllianceDocumentTypeAction } from "@/app/[locale]/(app)/alliances/actions";
import type { AllianceDocument } from "@/lib/db/schema";

// Classifies a document after upload — including ones uploaded before
// documentType existed, which stay uncategorized until staff pick one here.
export function AllianceDocumentTypeSelect({
  allianceId,
  document,
}: {
  allianceId: string;
  document: Pick<AllianceDocument, "id" | "documentType">;
}) {
  const t = useTranslations("Alliances.documents");
  const tDocType = useTranslations("AllianceDocumentType");
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === "unset") return;
    startTransition(() =>
      updateAllianceDocumentTypeAction(
        allianceId,
        document.id,
        value as (typeof allianceDocumentTypeValues)[number],
      ),
    );
  }

  return (
    <Select value={document.documentType ?? "unset"} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-7 w-44">
        <SelectValue placeholder={t("typeUnset")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unset" disabled>
          {t("typeUnset")}
        </SelectItem>
        {allianceDocumentTypeValues.map((type) => (
          <SelectItem key={type} value={type}>
            {tDocType(type)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
