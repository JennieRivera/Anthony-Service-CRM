"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { revokeCertificateAction } from "@/app/[locale]/(app)/academy/certificates/actions";

export function RevokeCertificateDialog({
  certificateId,
  enrollmentCaseId,
}: {
  certificateId: string;
  enrollmentCaseId: string;
}) {
  const t = useTranslations("AcademyCertificates");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      await revokeCertificateAction(certificateId, enrollmentCaseId, { reason });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("revokeError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="destructive" size="sm">{t("revokeCertificate")}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("revokeCertificate")}</DialogTitle>
          <DialogDescription>{t("revokeConfirmDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="revokeReason">{t("revokeReason")}</Label>
          <Textarea id="revokeReason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>

        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="destructive" onClick={handleSubmit} disabled={saving || !reason.trim()}>
            {saving ? t("revoking") : t("confirmRevoke")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
