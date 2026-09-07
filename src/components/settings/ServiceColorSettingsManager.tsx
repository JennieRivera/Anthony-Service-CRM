"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateServiceColorAction } from "@/app/[locale]/(app)/settings/service-colors/actions";
import { serviceTypeValues } from "@/lib/validation/client";
import type { ServiceColorSetting } from "@/lib/db/schema";

// Reuse the ServiceType translations already used everywhere else in the
// app for the 14 real service types; ServiceColorKey only needs entries
// for the 3 keys that aren't a serviceType (see schema.ts's comment on
// serviceColorSettings) — avoids maintaining the same 14 labels twice.
const REAL_SERVICE_TYPES: readonly string[] = serviceTypeValues;

export function ServiceColorSettingsManager({
  colors,
}: {
  colors: ServiceColorSetting[];
}) {
  const t = useTranslations("ServiceColors");
  const tService = useTranslations("ServiceType");
  const tKey = useTranslations("ServiceColorKey");
  const labelFor = (key: string) =>
    REAL_SERVICE_TYPES.includes(key) ? tService(key) : tKey(key);
  const [isPending, startTransition] = useTransition();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ colorName: string; colorHex: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(color: ServiceColorSetting) {
    setEditingKey(color.key);
    setDraft({ colorName: color.colorName, colorHex: color.colorHex });
    setError(null);
  }

  function cancelEdit() {
    setEditingKey(null);
    setDraft(null);
    setError(null);
  }

  function saveEdit(key: string) {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateServiceColorAction(key, draft);
        setEditingKey(null);
        setDraft(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {colors.map((color) => (
        <div
          key={color.key}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4"
        >
          {editingKey === color.key && draft ? (
            <div className="flex flex-1 flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>{t("colorName")}</Label>
                <Input
                  value={draft.colorName}
                  onChange={(e) => setDraft({ ...draft, colorName: e.target.value })}
                  className="w-40"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("colorHex")}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label={t("colorHex")}
                    className="h-9 w-10 shrink-0 rounded-md border border-input bg-transparent"
                    value={/^#[0-9a-fA-F]{6}$/.test(draft.colorHex) ? draft.colorHex : "#78909C"}
                    onChange={(e) => setDraft({ ...draft, colorHex: e.target.value })}
                  />
                  <Input
                    value={draft.colorHex}
                    onChange={(e) => setDraft({ ...draft, colorHex: e.target.value })}
                    className="w-28"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="ml-auto flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                  <X className="h-4 w-4" />
                  {t("cancel")}
                </Button>
                <Button type="button" size="sm" disabled={isPending} onClick={() => saveEdit(color.key)}>
                  {isPending ? t("saving") : t("save")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <span
                className="h-8 w-8 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: color.colorHex }}
                aria-hidden="true"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium text-foreground">{labelFor(color.key)}</span>
                <span className="text-sm text-muted-foreground">
                  {color.colorName} · {color.colorHex}
                </span>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => startEdit(color)}>
                <Pencil className="h-4 w-4" />
                {t("edit")}
              </Button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
