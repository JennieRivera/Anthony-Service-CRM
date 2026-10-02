"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { issueCertificateAction } from "@/app/[locale]/(app)/academy/certificates/actions";
import type { CertificateEligibilityVerdict, CertificateRequirements } from "@/lib/queries/academyCertificates";

// Issuance is one explicit admin action, gated on this dialog's own
// confirmation step — nothing here submits without the admin reviewing
// eligibility first, and an override always requires typing a reason
// (enforced again server-side by issueCertificateFormSchema, never only
// here).
export function IssueCertificateDialog({
  enrollmentCaseId,
  verdict,
  requirements,
  defaultIssuedBy,
}: {
  enrollmentCaseId: string;
  verdict: CertificateEligibilityVerdict;
  requirements: CertificateRequirements;
  defaultIssuedBy: string;
}) {
  const t = useTranslations("AcademyCertificates");
  const tGrade = useTranslations("AcademyGrade");
  const [open, setOpen] = useState(false);
  const [issuedBy, setIssuedBy] = useState(defaultIssuedBy);
  const [completionDate, setCompletionDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [overrideUsed, setOverrideUsed] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsOverride = verdict !== "eligible";

  const requirementEntries: { key: string; label: string; met: boolean | null }[] = [
    { key: "minimumAttendance", label: tGrade("minimumAttendance"), met: requirements.minimumAttendance },
    { key: "minimumGrade", label: tGrade("minimumGrade"), met: requirements.minimumGrade },
    { key: "allModulesCompleted", label: tGrade("allModulesCompleted"), met: requirements.allModulesCompleted },
    { key: "allEvaluationsGraded", label: tGrade("allEvaluationsGraded"), met: requirements.allEvaluationsGraded },
  ];

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await issueCertificateAction(enrollmentCaseId, {
        issuedBy,
        completionDate,
        notes,
        overrideUsed,
        overrideReason,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("issueError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setOverrideUsed(false);
          setOverrideReason("");
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button type="button">{t("issueCertificate")}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("issueCertificate")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-md border border-border p-3">
            <p className="text-sm font-medium text-foreground">
              {t("eligibilityLabel")}:{" "}
              <span
                className={
                  verdict === "eligible"
                    ? "text-success"
                    : verdict === "not_eligible"
                      ? "text-destructive"
                      : "text-muted-foreground"
                }
              >
                {t(verdict)}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              {requirementEntries.map((r) => (
                <span key={r.key} className="text-foreground">
                  {r.label}:{" "}
                  <span className="font-medium">
                    {r.met == null ? tGrade("notConfigured") : r.met ? tGrade("met") : tGrade("notMet")}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="issuedBy">{t("issuedBy")}</Label>
            <Input id="issuedBy" value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="completionDate">{t("completionDate")}</Label>
            <Input
              id="completionDate"
              type="date"
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="certNotes">{t("notes")}</Label>
            <Textarea id="certNotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {needsOverride && (
            <div className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3">
              <label className="flex items-center gap-2 text-sm text-amber-900">
                <Checkbox checked={overrideUsed} onCheckedChange={(v) => setOverrideUsed(Boolean(v))} />
                {t("overrideCheckbox")}
              </label>
              {overrideUsed && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="overrideReason">{t("overrideReason")}</Label>
                  <Textarea
                    id="overrideReason"
                    rows={2}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              saving ||
              (needsOverride && (!overrideUsed || !overrideReason.trim()))
            }
          >
            {saving ? t("issuing") : t("confirmIssue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
