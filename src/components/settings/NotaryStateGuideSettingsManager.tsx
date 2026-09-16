"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Pencil, X } from "lucide-react";
import { StateNames } from "@mirawision/usa-map-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateNotaryStateGuideAction } from "@/app/[locale]/(app)/settings/notary-guide/actions";
import {
  notaryStateGuideStatusValues,
  type NotaryStateGuideFormValues,
} from "@/lib/validation/notaryStateGuide";
import type { NotaryStateGuide } from "@/lib/db/schema";

const STATUS_BADGE: Record<string, string> = {
  verified: "bg-[#dcefe0] text-[#1b5e20]",
  needs_review: "bg-[#fdecc8] text-[#8a5a00]",
  unavailable: "bg-[#fbe0e0] text-[#8a1c1c]",
};

type Draft = NotaryStateGuideFormValues;

function toDraft(row: NotaryStateGuide): Draft {
  return {
    officialAgency: row.officialAgency ?? "",
    officialWebsite: row.officialWebsite ?? "",
    commissionLink: row.commissionLink ?? "",
    examLink: row.examLink ?? "",
    requirementsLink: row.requirementsLink ?? "",
    sourceUrl: row.sourceUrl ?? "",
    status: row.status as Draft["status"],
  };
}

export function NotaryStateGuideSettingsManager({
  rows,
}: {
  rows: NotaryStateGuide[];
}) {
  const t = useTranslations("NotaryStateGuideSettings");
  const [isPending, startTransition] = useTransition();
  const [editingState, setEditingState] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  function startEdit(row: NotaryStateGuide) {
    setEditingState(row.state);
    setDraft(toDraft(row));
    setError(null);
  }

  function cancelEdit() {
    setEditingState(null);
    setDraft(null);
    setError(null);
  }

  function saveEdit(state: string) {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateNotaryStateGuideAction(state, draft);
        setEditingState(null);
        setDraft(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <div
          key={row.state}
          className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
        >
          {editingState === row.state && draft ? (
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("officialAgency")}>
                  <Input
                    value={draft.officialAgency}
                    onChange={(e) => setDraft({ ...draft, officialAgency: e.target.value })}
                  />
                </Field>
                <Field label={t("officialWebsite")}>
                  <Input
                    placeholder="https://"
                    value={draft.officialWebsite}
                    onChange={(e) => setDraft({ ...draft, officialWebsite: e.target.value })}
                  />
                </Field>
                <Field label={t("commissionLink")}>
                  <Input
                    placeholder="https://"
                    value={draft.commissionLink}
                    onChange={(e) => setDraft({ ...draft, commissionLink: e.target.value })}
                  />
                </Field>
                <Field label={t("examLink")}>
                  <Input
                    value={draft.examLink}
                    onChange={(e) => setDraft({ ...draft, examLink: e.target.value })}
                  />
                </Field>
                <Field label={t("requirementsLink")}>
                  <Input
                    placeholder="https://"
                    value={draft.requirementsLink}
                    onChange={(e) => setDraft({ ...draft, requirementsLink: e.target.value })}
                  />
                </Field>
                <Field label={t("sourceUrl")}>
                  <Input
                    placeholder="https://"
                    value={draft.sourceUrl}
                    onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })}
                  />
                </Field>
                <Field label={t("status")}>
                  <Select
                    value={draft.status}
                    onValueChange={(value) =>
                      value && setDraft({ ...draft, status: value as Draft["status"] })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notaryStateGuideStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {t(`status_${status}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={cancelEdit}>
                  <X className="h-4 w-4" />
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => saveEdit(row.state)}
                >
                  {isPending ? t("saving") : t("save")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium text-foreground">
                  {StateNames[row.state as keyof typeof StateNames]} ({row.state})
                </span>
                <span className="text-sm text-muted-foreground">
                  {row.officialAgency || t("noAgencyYet")}
                </span>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGE[row.status] ?? ""}`}
              >
                {t(`status_${row.status}`)}
              </span>
              <span className="text-xs text-muted-foreground">
                {row.lastVerifiedDate
                  ? `${t("lastVerified")}: ${row.lastVerifiedDate}`
                  : t("neverVerified")}
              </span>
              <Button type="button" size="sm" variant="outline" onClick={() => startEdit(row)}>
                <Pencil className="h-4 w-4" />
                {t("edit")}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
