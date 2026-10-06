"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { assignNetworkReferralAction } from "@/app/[locale]/(app)/referrals/actions";

// Option A: staff picks which ally receives a referral another ally sent
// for the AMS network, writes what that ally should see, and approves.
export function NetworkReferralAssign({
  referralId,
  alliances,
  current,
}: {
  referralId: string;
  alliances: { id: string; organizationName: string }[];
  current: { assignedAllianceId: string | null; assigneeNote: string | null; showAssigneeToSender: boolean };
}) {
  const t = useTranslations("Referrals.network");
  const [allianceId, setAllianceId] = useState(current.assignedAllianceId ?? "");
  const [note, setNote] = useState(current.assigneeNote ?? "");
  const [show, setShow] = useState(current.showAssigneeToSender);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!allianceId) {
      toast.error(t("chooseAlly"));
      return;
    }
    startTransition(async () => {
      const result = await assignNetworkReferralAction(referralId, { assignedAllianceId: allianceId, assigneeNote: note, showAssigneeToSender: show });
      if (result.ok) toast.success(t("assigned"));
      else toast.error(t(`errors.${result.error}`));
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 sm:max-w-md">
        <Label htmlFor="assign-ally">{t("ally")}</Label>
        <select
          id="assign-ally"
          value={allianceId}
          onChange={(e) => setAllianceId(e.target.value)}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="">{t("chooseAlly")}</option>
          {alliances.map((a) => (
            <option key={a.id} value={a.id}>
              {a.organizationName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="assign-note">{t("noteForAlly")}</Label>
        <Textarea id="assign-note" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        <p className="text-xs text-muted-foreground">{t("noteForAllyHint")}</p>
      </div>
      <label htmlFor="assign-show" className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
        <Checkbox id="assign-show" checked={show} onCheckedChange={(v) => setShow(v === true)} className="mt-0.5" />
        <span>{t("showAssignee")}</span>
      </label>
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? t("assigning") : current.assignedAllianceId ? t("reassign") : t("assign")}
      </Button>
    </form>
  );
}
