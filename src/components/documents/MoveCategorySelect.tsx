"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectableDocumentCategoryValues } from "@/lib/validation/documentCategory";
import { updateDocumentCategoryAction } from "@/app/[locale]/(app)/documents/actions";

export function MoveCategorySelect({
  documentId,
  category,
}: {
  documentId: string;
  category: string | null;
}) {
  const t = useTranslations("Documents");
  const tCategory = useTranslations("DocumentCategory");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      await updateDocumentCategoryAction(documentId, value);
      router.refresh();
    });
  }

  return (
    <Select value={category ?? "other"} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-auto text-xs" title={t("moveToFolder")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {selectableDocumentCategoryValues.map((value) => (
          <SelectItem key={value} value={value}>
            {tCategory(value)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
