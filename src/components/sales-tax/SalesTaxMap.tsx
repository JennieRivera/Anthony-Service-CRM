"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { StateAbbreviations, StateNames } from "@mirawision/usa-map-react";
import { USStateFlags } from "us-state-flags";
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

// Aqua/turquoise ("verde agua") recolor, softened to a pale baby-blue
// feel per feedback (the first pass was too saturated). The 5 colors are
// a status legend, not just decoration (green = active cases, blue = info
// available, gold = pending, red = past due, gray = no records) — red and
// gold are kept as unambiguous alert colors on purpose so a past-due or
// pending state still pops against the pale aqua theme instead of
// blending into it.
const COLOR_HEX: Record<SalesTaxMapStateData["color"], string> = {
  green: "#7CBCB2",
  blue: "#BFE9E4",
  gold: "#C9A15B",
  red: "#dc2626",
  gray: "#EAF6F4",
};
const MAP_STROKE = "#3F7A72";

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
  const [query, setQuery] = useState("");

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
      setQuery("");
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

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return StateAbbreviations.filter(
      (abbr) =>
        StateNames[abbr].toLowerCase().includes(q) || abbr.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  const states = useMemo(() => {
    const settings: Record<string, UsaStateMapStateConfig> = {};

    StateAbbreviations.forEach((abbr) => {
      const stateData = data[abbr];
      const color = stateData?.color ?? "gray";

      settings[abbr] = {
        fill: COLOR_HEX[color],
        stroke: MAP_STROKE,
        onClick: () => openStateDialog(abbr),
        tooltip: (
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: 2 }}>
            <USStateFlags state={abbr} showFlag flagSize="sm" />
            <div>
              <strong>{abbr}</strong>
              <br />
              {t(`legend.${color}`)}
              {stateData && stateData.activeCaseCount > 0
                ? ` (${stateData.activeCaseCount})`
                : ""}
            </div>
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
      <div className="relative sm:max-w-sm">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
        />
        {suggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md">
            {suggestions.map((abbr) => (
              <button
                key={abbr}
                type="button"
                onClick={() => openStateDialog(abbr)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <USStateFlags state={abbr} showFlag flagSize="xs" />
                {StateNames[abbr]} ({abbr})
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#BFE3DD] bg-gradient-to-b from-[#EAF6FB] to-white p-4">
        <UsaStateMap
          states={states}
          defaultState={{ fill: COLOR_HEX.gray, stroke: MAP_STROKE }}
          showFlags
        />
      </div>

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
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          {selectedState && (
            <DialogHeader className="items-center text-center">
              <div className="overflow-hidden rounded-xl border-2 border-[#3F7A72]/40 shadow-lg">
                <USStateFlags state={selectedState} showFlag flagSize="lg" />
              </div>
              <DialogTitle className="mt-2">
                {t("editTitle", { state: selectedState ?? "" })}
              </DialogTitle>
            </DialogHeader>
          )}

          {/* Read-only display of the current official links — rendered
              straight from `selectedData`, independent of the edit form's
              react-hook-form state below, so the info is always visible
              the instant the dialog opens regardless of form timing. */}
          <dl className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <InfoRow label={t("stateTaxAgency")} value={selectedData?.info?.stateTaxAgency} notFoundLabel={t("notFound")} />
            <InfoRow label={t("officialWebsite")} value={selectedData?.info?.officialWebsite} notFoundLabel={t("notFound")} />
            <InfoRow label={t("registrationLink")} value={selectedData?.info?.registrationLink} notFoundLabel={t("notFound")} />
            <InfoRow label={t("filingPortalLink")} value={selectedData?.info?.filingPortalLink} notFoundLabel={t("notFound")} />
          </dl>

          {selectedData?.info?.officialWebsite && (
            <Button
              render={
                <a
                  href={selectedData.info.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              className="w-full"
            >
              {t("openOfficialWebsite")}
            </Button>
          )}

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

function isUrl(value: string | null | undefined): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

function InfoRow({
  label,
  value,
  notFoundLabel,
}: {
  label: string;
  value: string | null | undefined;
  notFoundLabel: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </dt>
      <dd>
        {!value ? (
          notFoundLabel
        ) : isUrl(value) ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-[#2C7A70] underline"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
