"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImmigrationFormFormDialog } from "./ImmigrationFormFormDialog";
import {
  createImmigrationFormAction,
  updateImmigrationFormAction,
  toggleImmigrationFormActiveAction,
  deleteImmigrationFormAction,
} from "@/app/[locale]/(app)/immigration-forms/actions";
import type { ImmigrationForm } from "@/lib/db/schema";

export function ImmigrationFormsManager({ forms }: { forms: ImmigrationForm[] }) {
  const t = useTranslations("ImmigrationForms");
  const tCategory = useTranslations("ImmigrationFormCategory");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ImmigrationFormFormDialog onSubmit={createImmigrationFormAction} />
      </div>

      {forms.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {forms.map((form) => (
            <div
              key={form.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={form.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline"
                  >
                    {form.formNumber} — {form.formName}
                  </a>
                  <Badge variant="outline">{tCategory(form.category)}</Badge>
                  {!form.active && (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t("retired")}
                    </Badge>
                  )}
                </div>
                {form.editionNotes && (
                  <span className="truncate text-sm text-muted-foreground">
                    {form.editionNotes}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {t("lastVerifiedDate")}:{" "}
                  {form.lastVerifiedDate
                    ? new Date(form.lastVerifiedDate).toLocaleDateString()
                    : "—"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() =>
                      toggleImmigrationFormActiveAction(form.id, !form.active),
                    )
                  }
                >
                  {form.active ? t("retire") : t("reactivate")}
                </Button>
                <ImmigrationFormFormDialog
                  form={form}
                  onSubmit={(values) => updateImmigrationFormAction(form.id, values)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => deleteImmigrationFormAction(form.id))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
