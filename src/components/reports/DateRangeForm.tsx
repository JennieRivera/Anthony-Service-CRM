"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function DateRangeForm({ from, to, tab }: { from: string; to: string; tab?: string }) {
  const t = useTranslations("Reports");
  const router = useRouter();
  const [fromDate, setFromDate] = useState(from);
  const [toDate, setToDate] = useState(to);
  const [isPending, startTransition] = useTransition();
  const invalid = !fromDate || !toDate || fromDate > toDate;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="from">{t("from")}</Label>
        <Input
          id="from"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="to">{t("to")}</Label>
        <Input
          id="to"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
        />
      </div>
      <Button
        disabled={isPending || invalid}
        onClick={() =>
          // Keeps the open tab; isPending shows "Loading…" until the new
          // report has rendered.
          startTransition(() =>
            router.push(`/reports?from=${fromDate}&to=${toDate}${tab ? `&tab=${tab}` : ""}`),
          )
        }
      >
        {isPending ? t("applying") : t("apply")}
      </Button>
      {invalid && <p className="pb-2 text-sm text-destructive">{t("invalidRange")}</p>}
    </div>
  );
}
