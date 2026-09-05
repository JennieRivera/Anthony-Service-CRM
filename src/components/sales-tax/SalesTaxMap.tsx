"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { StateAbbreviations } from "@mirawision/usa-map-react";
import { UsaStateMap, type UsaStateMapStateConfig } from "@/components/maps/UsaStateMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  salesTaxStateInfoFormSchema,
  type SalesTaxStateInfoFormValues,
} from "@/lib/validation/salesTaxMap";
import type { SalesTaxMapStateData } from "@/lib/queries/salesTaxMap";

const COLOR_HEX: Record<SalesTaxMapStateData["color"], string> = {
  green: "#16a34a",
  blue: "#2563eb",
  gold: "#b8964a",
  red: "#dc2626",
  gray: "#c9c3b4",
};

export function SalesTaxMap({
  data,
  onSave,
  initialState,
}: {
  data: Record<string, SalesTaxMapStateData>;
  onSave: (
    state: string,
    values: SalesTaxStateInfoFormValues,
  ) => Promise<void>;
  // Set from a map "quick link" (e.g. the Company Registration map's
  // per-state summary) so this map opens straight to that state instead
  // of requiring a second click.
  initialState?: string;
}) {
  const t = useTranslations("SalesTaxMap");
  // Resolved once at mount from the deep-linked state (if any) — feeds the
  // form's initial defaultValues directly instead of opening via an
  // effect, so there's no synchronous setState-in-effect and no flash of
  // an empty dialog before it populates.
  const initialStateAbbr =
    initialState && StateAbbreviations.includes(initialState.toUpperCase())
      ? initialState.toUpperCase()
      : null;
  const initialStateData = initialStateAbbr ? data[initialStateAbbr] : undefined;

  const [selectedState, setSelectedState] = useState<string | null>(initialStateAbbr);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, reset } = useForm<SalesTaxStateInfoFormValues>({
    resolver: zodResolver(salesTaxStateInfoFormSchema),
    defaultValues: {
      stateTaxAgency: initialStateData?.info?.stateTaxAgency ?? "",
      officialWebsite: initialStateData?.info?.officialWebsite ?? "",
      registrationLink: initialStateData?.info?.registrationLink ?? "",
      filingPortalLink: initialStateData?.info?.filingPortalLink ?? "",
      businessRegistrationLink: initialStateData?.info?.businessRegistrationLink ?? "",
      notes: initialStateData?.info?.notes ?? "",
      lastVerifiedDate: initialStateData?.info?.lastVerifiedDate ?? "",
      verifiedBy: initialStateData?.info?.verifiedBy ?? "",
    },
  });

  const openStateDialog = useCallback(
    (abbr: string) => {
      const stateData = data[abbr];
      setSelectedState(abbr);
      reset({
        stateTaxAgency: stateData?.info?.stateTaxAgency ?? "",
        officialWebsite: stateData?.info?.officialWebsite ?? "",
        registrationLink: stateData?.info?.registrationLink ?? "",
        filingPortalLink: stateData?.info?.filingPortalLink ?? "",
        businessRegistrationLink: stateData?.info?.businessRegistrationLink ?? "",
        notes: stateData?.info?.notes ?? "",
        lastVerifiedDate: stateData?.info?.lastVerifiedDate ?? "",
        verifiedBy: stateData?.info?.verifiedBy ?? "",
      });
    },
    [data, reset],
  );

  const states = useMemo(() => {
    const settings: Record<string, UsaStateMapStateConfig> = {};

    StateAbbreviations.forEach((abbr) => {
      const stateData = data[abbr];
      const color = stateData?.color ?? "gray";

      settings[abbr] = {
        fill: COLOR_HEX[color],
        stroke: "#0F1A2B",
        onClick: () => openStateDialog(abbr),
        tooltip: (
          <div style={{ fontSize: 12, padding: 2 }}>
            <strong>{abbr}</strong>
            <br />
            {t(`legend.${color}`)}
            {stateData && stateData.activeCaseCount > 0
              ? ` (${stateData.activeCaseCount})`
              : ""}
          </div>
        ),
      };
    });

    return settings;
  }, [data, openStateDialog, t]);

  function submit(values: SalesTaxStateInfoFormValues) {
    if (!selectedState) return;
    startTransition(async () => {
      await onSave(selectedState, values);
      setSelectedState(null);
    });
  }

  const selectedData = selectedState ? data[selectedState] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <UsaStateMap
        states={states}
        defaultState={{ fill: COLOR_HEX.gray, stroke: "#0F1A2B" }}
      />

      <div className="flex flex-wrap items-center gap-4 text-sm">
        {(Object.keys(COLOR_HEX) as (keyof typeof COLOR_HEX)[]).map((color) => (
          <div key={color} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: COLOR_HEX[color] }}
              aria-hidden
            />
            <span className="text-muted-foreground">{t(`legend.${color}`)}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>

      <Dialog
        open={selectedState !== null}
        onOpenChange={(open) => !open && setSelectedState(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("editTitle", { state: selectedState ?? "" })}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stateTaxAgency">{t("stateTaxAgency")}</Label>
                <Input id="stateTaxAgency" {...register("stateTaxAgency")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="officialWebsite">{t("officialWebsite")}</Label>
                <Input
                  id="officialWebsite"
                  placeholder="https://"
                  {...register("officialWebsite")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="registrationLink">{t("registrationLink")}</Label>
                <Input
                  id="registrationLink"
                  placeholder="https://"
                  {...register("registrationLink")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filingPortalLink">{t("filingPortalLink")}</Label>
                <Input
                  id="filingPortalLink"
                  placeholder="https://"
                  {...register("filingPortalLink")}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="businessRegistrationLink">
                  {t("businessRegistrationLink")}
                </Label>
                <Input
                  id="businessRegistrationLink"
                  placeholder="https://"
                  {...register("businessRegistrationLink")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lastVerifiedDate">{t("lastVerifiedDate")}</Label>
                <Input
                  id="lastVerifiedDate"
                  type="date"
                  {...register("lastVerifiedDate")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="verifiedBy">{t("verifiedBy")}</Label>
                <Input id="verifiedBy" {...register("verifiedBy")} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="salesTaxMapNotes">{t("notes")}</Label>
                <Textarea id="salesTaxMapNotes" rows={2} {...register("notes")} />
              </div>
            </div>
            {selectedData && selectedData.activeCaseCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {t("activeCases", { count: selectedData.activeCaseCount })}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
