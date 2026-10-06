"use client";

import { useState } from "react";
import { Controller, type Control } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PARTNER_SERVICES, type PartnerService, type CaseFormValues } from "@/lib/validation/case";

// Partner-based services (Remodeling, Corporate Events): pick the allied
// contractor / chef from Alliances. Lists only alliances of the matching
// type, unless staff asks to see every alliance; the one already chosen
// always stays listed.
export function CaseAllyPicker({
  service,
  control,
  value,
  alliances,
}: {
  service: PartnerService;
  control: Control<CaseFormValues>;
  value: string | undefined;
  alliances: { id: string; organizationName: string; organizationType?: string | null }[];
}) {
  const t = useTranslations(`Cases.partners.${service}`);
  const { field: fieldName, allianceType } = PARTNER_SERVICES[service];
  const [showAll, setShowAll] = useState(false);
  const ofType = alliances.filter((a) => a.organizationType === allianceType);
  const options = showAll ? alliances : alliances.filter((a) => a.organizationType === allianceType || a.id === value);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
      <h3 className="font-heading text-base text-foreground">{t("title")}</h3>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <div className="flex flex-col gap-1.5 sm:max-w-md">
        <Label>{t("field")}</Label>
        <Controller
          control={control}
          name={fieldName}
          render={({ field }) => (
            <Select value={field.value || "none"} onValueChange={(v) => field.onChange(!v || v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("none")}</SelectItem>
                {options.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.organizationName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {ofType.length === 0 && !showAll && <p className="text-xs text-muted-foreground">{t("noneOfType")}</p>}
        <button
          type="button"
          className="w-fit cursor-pointer text-sm text-primary underline"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? t("onlyType") : t("showAll")}
        </button>
      </div>
    </div>
  );
}
