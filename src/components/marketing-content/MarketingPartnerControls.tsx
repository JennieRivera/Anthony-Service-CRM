"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Network, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setMarketingApprovalAction, setMarketingPartnerShareAction } from "@/app/[locale]/(app)/marketing-content/partner-actions";

// On each Marketing Content card: approve/reject material an alliance sent
// (pending), and choose which partners can download it.
export function MarketingPartnerControls({
  assetId,
  approvalStatus,
  submittedBy,
  share,
  sharedWith,
  alliances,
}: {
  assetId: string;
  approvalStatus: "approved" | "pending" | "rejected";
  submittedBy: string | null;
  share: "none" | "all" | "selected";
  sharedWith: string[];
  alliances: { id: string; organizationName: string }[];
}) {
  const t = useTranslations("MarketingContent.partners");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState(share);
  const [chosen, setChosen] = useState<Set<string>>(new Set(sharedWith));

  const review = (status: "approved" | "rejected") =>
    startTransition(async () => {
      await setMarketingApprovalAction(assetId, status);
      router.refresh();
    });

  const save = () =>
    startTransition(async () => {
      await setMarketingPartnerShareAction(assetId, mode, [...chosen]);
      setOpen(false);
      router.refresh();
    });

  const shareLabel = share === "all" ? t("sharedAll") : share === "selected" ? t("sharedSome", { count: sharedWith.length }) : t("notShared");

  return (
    <div className="flex flex-col gap-1.5">
      {submittedBy && (
        <p className="text-xs text-muted-foreground">
          {t("submittedBy", { name: submittedBy })} · <span className="font-medium text-foreground">{t(`status.${approvalStatus}`)}</span>
        </p>
      )}
      {approvalStatus === "pending" && (
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={isPending} onClick={() => review("approved")}>
            <Check className="h-4 w-4" />
            {t("approve")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={() => review("rejected")}>
            <X className="h-4 w-4" />
            {t("reject")}
          </Button>
        </div>
      )}
      {approvalStatus === "approved" && (
        <Button type="button" size="sm" variant="ghost" className="justify-start" onClick={() => setOpen(true)}>
          <Network className="h-4 w-4" />
          {shareLabel}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("shareTitle")}</DialogTitle>
            <DialogDescription>{t("shareHint")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 text-sm" role="radiogroup">
            {(["none", "all", "selected"] as const).map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-2">
                <input type="radio" name={`share-${assetId}`} checked={mode === m} onChange={() => setMode(m)} />
                {t(`mode.${m}`)}
              </label>
            ))}
          </div>
          {mode === "selected" && (
            <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-md border border-border p-2 text-sm">
              {alliances.length === 0 && <li className="text-muted-foreground">{t("noAlliances")}</li>}
              {alliances.map((a) => (
                <li key={a.id}>
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={chosen.has(a.id)}
                      onCheckedChange={(v) =>
                        setChosen((prev) => {
                          const next = new Set(prev);
                          if (v === true) next.add(a.id);
                          else next.delete(a.id);
                          return next;
                        })
                      }
                    />
                    {a.organizationName}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={save} disabled={isPending}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
