"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { StateAbbreviations } from "@mirawision/usa-map-react";
import { UsaStateMap, type UsaStateMapStateConfig } from "@/components/maps/UsaStateMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  latinoBusinessDataFormSchema,
  latinoOpportunityScoreValues,
  type LatinoBusinessDataFormValues,
} from "@/lib/validation/latinoBusinessMap";
import type { LatinoBusinessMapStateData } from "@/lib/queries/latinoBusinessMap";

const SCORE_COLOR: Record<
  (typeof latinoOpportunityScoreValues)[number],
  string
> = {
  very_high: "#14532d",
  high: "#16a34a",
  medium: "#b8964a",
  emerging: "#7dd3fc",
  insufficient_data: "#c9c3b4",
};

const DIMMED_FILL = "#e8e5dc";

type Filters = {
  scores: Set<(typeof latinoOpportunityScoreValues)[number]>;
  minPopulation: string;
  minBusinesses: string;
  minClients: string;
  minPartners: string;
  minRevenue: string;
  minAssociations: string;
  industry: string;
};

const DEFAULT_FILTERS: Filters = {
  scores: new Set(latinoOpportunityScoreValues),
  minPopulation: "",
  minBusinesses: "",
  minClients: "",
  minPartners: "",
  minRevenue: "",
  minAssociations: "",
  industry: "",
};

function passesFilters(
  stateData: LatinoBusinessMapStateData | undefined,
  filters: Filters,
): boolean {
  const info = stateData?.info;
  const score = info?.opportunityScore ?? "insufficient_data";
  if (!filters.scores.has(score)) return false;

  const checks: [string, number | null | undefined][] = [
    [filters.minPopulation, info?.estimatedLatinoPopulation],
    [filters.minBusinesses, info?.estimatedLatinoBusinessPresence],
    [filters.minClients, info?.amsClientsCount],
    [filters.minPartners, stateData?.strategicPartnersCount],
    [filters.minRevenue, info?.revenueFromState ? Number(info.revenueFromState) : null],
    [
      filters.minAssociations,
      (stateData?.associationsCount ?? 0) + (stateData?.chambersCount ?? 0),
    ],
  ];
  for (const [thresholdStr, value] of checks) {
    if (!thresholdStr) continue;
    const threshold = Number(thresholdStr);
    if (Number.isNaN(threshold)) continue;
    if (!value || value < threshold) return false;
  }

  if (filters.industry.trim()) {
    const needle = filters.industry.trim().toLowerCase();
    if (!info?.topIndustries?.toLowerCase().includes(needle)) return false;
  }

  return true;
}

export function LatinoBusinessMap({
  data,
  onSave,
  initialState,
}: {
  data: Record<string, LatinoBusinessMapStateData>;
  onSave: (
    state: string,
    values: LatinoBusinessDataFormValues,
  ) => Promise<void>;
  // Set from a map "quick link" (e.g. the Company Registration map's
  // per-state summary) so this map opens straight to that state instead
  // of requiring a second click.
  initialState?: string;
}) {
  const t = useTranslations("LatinoBusinessMap");
  const tScore = useTranslations("LatinoOpportunityScore");
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
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, reset } = useForm<LatinoBusinessDataFormValues>({
    resolver: zodResolver(latinoBusinessDataFormSchema),
    defaultValues: {
      estimatedLatinoPopulation:
        initialStateData?.info?.estimatedLatinoPopulation?.toString() ?? "",
      estimatedLatinoBusinessPresence:
        initialStateData?.info?.estimatedLatinoBusinessPresence?.toString() ?? "",
      topIndustries: initialStateData?.info?.topIndustries ?? "",
      amsClientsCount: initialStateData?.info?.amsClientsCount?.toString() ?? "",
      amsLeadsCount: initialStateData?.info?.amsLeadsCount?.toString() ?? "",
      revenueFromState: initialStateData?.info?.revenueFromState ?? "",
      opportunityScore: initialStateData?.info?.opportunityScore ?? "insufficient_data",
      potentialServices: initialStateData?.info?.potentialServices ?? "",
      expansionNotes: initialStateData?.info?.expansionNotes ?? "",
      notes: initialStateData?.info?.notes ?? "",
      sourceName: initialStateData?.info?.sourceName ?? "",
      sourceUrl: initialStateData?.info?.sourceUrl ?? "",
      sourceYear: initialStateData?.info?.sourceYear?.toString() ?? "",
      sourceLastUpdated: initialStateData?.info?.sourceLastUpdated ?? "",
      sourceDataType: initialStateData?.info?.sourceDataType ?? "",
      verifiedBy: initialStateData?.info?.verifiedBy ?? "",
    },
  });

  const openStateDialog = useCallback(
    (abbr: string) => {
      const stateData = data[abbr];
      setSelectedState(abbr);
      reset({
        estimatedLatinoPopulation:
          stateData?.info?.estimatedLatinoPopulation?.toString() ?? "",
        estimatedLatinoBusinessPresence:
          stateData?.info?.estimatedLatinoBusinessPresence?.toString() ?? "",
        topIndustries: stateData?.info?.topIndustries ?? "",
        amsClientsCount: stateData?.info?.amsClientsCount?.toString() ?? "",
        amsLeadsCount: stateData?.info?.amsLeadsCount?.toString() ?? "",
        revenueFromState: stateData?.info?.revenueFromState ?? "",
        opportunityScore: stateData?.info?.opportunityScore ?? "insufficient_data",
        potentialServices: stateData?.info?.potentialServices ?? "",
        expansionNotes: stateData?.info?.expansionNotes ?? "",
        notes: stateData?.info?.notes ?? "",
        sourceName: stateData?.info?.sourceName ?? "",
        sourceUrl: stateData?.info?.sourceUrl ?? "",
        sourceYear: stateData?.info?.sourceYear?.toString() ?? "",
        sourceLastUpdated: stateData?.info?.sourceLastUpdated ?? "",
        sourceDataType: stateData?.info?.sourceDataType ?? "",
        verifiedBy: stateData?.info?.verifiedBy ?? "",
      });
    },
    [data, reset],
  );

  const states = useMemo(() => {
    const settings: Record<string, UsaStateMapStateConfig> = {};

    StateAbbreviations.forEach((abbr) => {
      const stateData = data[abbr];
      const score = stateData?.info?.opportunityScore ?? "insufficient_data";
      const matches = passesFilters(stateData, filters);

      settings[abbr] = {
        fill: matches ? SCORE_COLOR[score] : DIMMED_FILL,
        stroke: "#0F1A2B",
        onClick: () => openStateDialog(abbr),
        tooltip: (
          <div style={{ fontSize: 12, padding: 2 }}>
            <strong>{abbr}</strong>
            <br />
            {tScore(score)}
            <br />
            {t("tooltipCounts", {
              associations: stateData?.associationsCount ?? 0,
              chambers: stateData?.chambersCount ?? 0,
              partners: stateData?.strategicPartnersCount ?? 0,
            })}
          </div>
        ),
      };
    });

    return settings;
  }, [data, filters, openStateDialog, t, tScore]);

  function submit(values: LatinoBusinessDataFormValues) {
    if (!selectedState) return;
    startTransition(async () => {
      await onSave(selectedState, values);
      setSelectedState(null);
    });
  }

  function toggleScore(score: (typeof latinoOpportunityScoreValues)[number]) {
    setFilters((prev) => {
      const next = new Set(prev.scores);
      if (next.has(score)) next.delete(score);
      else next.add(score);
      return { ...prev, scores: next };
    });
  }

  const selectedData = selectedState ? data[selectedState] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium text-foreground">{t("filters")}</h3>
        <div className="flex flex-wrap gap-3">
          {latinoOpportunityScoreValues.map((score) => (
            <label key={score} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={filters.scores.has(score)}
                onCheckedChange={() => toggleScore(score)}
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: SCORE_COLOR[score] }}
                aria-hidden
              />
              {tScore(score)}
            </label>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Input
            placeholder={t("filterMinPopulation")}
            type="number"
            value={filters.minPopulation}
            onChange={(e) => setFilters((f) => ({ ...f, minPopulation: e.target.value }))}
          />
          <Input
            placeholder={t("filterMinBusinesses")}
            type="number"
            value={filters.minBusinesses}
            onChange={(e) => setFilters((f) => ({ ...f, minBusinesses: e.target.value }))}
          />
          <Input
            placeholder={t("filterMinClients")}
            type="number"
            value={filters.minClients}
            onChange={(e) => setFilters((f) => ({ ...f, minClients: e.target.value }))}
          />
          <Input
            placeholder={t("filterMinPartners")}
            type="number"
            value={filters.minPartners}
            onChange={(e) => setFilters((f) => ({ ...f, minPartners: e.target.value }))}
          />
          <Input
            placeholder={t("filterMinRevenue")}
            type="number"
            value={filters.minRevenue}
            onChange={(e) => setFilters((f) => ({ ...f, minRevenue: e.target.value }))}
          />
          <Input
            placeholder={t("filterMinAssociations")}
            type="number"
            value={filters.minAssociations}
            onChange={(e) => setFilters((f) => ({ ...f, minAssociations: e.target.value }))}
          />
        </div>
        <Input
          placeholder={t("filterIndustry")}
          value={filters.industry}
          onChange={(e) => setFilters((f) => ({ ...f, industry: e.target.value }))}
          className="sm:max-w-xs"
        />
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            {t("clearFilters")}
          </Button>
        </div>
      </div>

      <UsaStateMap states={states} defaultState={{ fill: DIMMED_FILL, stroke: "#0F1A2B" }} />

      <div className="flex flex-wrap items-center gap-4 text-sm">
        {latinoOpportunityScoreValues.map((score) => (
          <div key={score} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: SCORE_COLOR[score] }}
              aria-hidden
            />
            <span className="text-muted-foreground">{tScore(score)}</span>
          </div>
        ))}
      </div>

      <Dialog
        open={selectedState !== null}
        onOpenChange={(open) => !open && setSelectedState(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("editTitle", { state: selectedState ?? "" })}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
            {selectedData && (
              <p className="text-sm text-muted-foreground">
                {t("liveCounts", {
                  associations: selectedData.associationsCount,
                  chambers: selectedData.chambersCount,
                  partners: selectedData.strategicPartnersCount,
                })}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="estimatedLatinoPopulation">
                  {t("estimatedLatinoPopulation")}
                </Label>
                <Input
                  id="estimatedLatinoPopulation"
                  type="number"
                  {...register("estimatedLatinoPopulation")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="estimatedLatinoBusinessPresence">
                  {t("estimatedLatinoBusinessPresence")}
                </Label>
                <Input
                  id="estimatedLatinoBusinessPresence"
                  type="number"
                  {...register("estimatedLatinoBusinessPresence")}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="topIndustries">{t("topIndustries")}</Label>
                <Input id="topIndustries" {...register("topIndustries")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amsClientsCount">{t("amsClientsCount")}</Label>
                <Input id="amsClientsCount" type="number" {...register("amsClientsCount")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amsLeadsCount">{t("amsLeadsCount")}</Label>
                <Input id="amsLeadsCount" type="number" {...register("amsLeadsCount")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="revenueFromState">{t("revenueFromState")}</Label>
                <Input
                  id="revenueFromState"
                  type="number"
                  step="0.01"
                  {...register("revenueFromState")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("opportunityScore")}</Label>
                <Controller
                  control={control}
                  name="opportunityScore"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {latinoOpportunityScoreValues.map((score) => (
                          <SelectItem key={score} value={score}>
                            {tScore(score)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="potentialServices">{t("potentialServices")}</Label>
                <Input id="potentialServices" {...register("potentialServices")} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="expansionNotes">{t("expansionNotes")}</Label>
                <Textarea id="expansionNotes" rows={2} {...register("expansionNotes")} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="latinoMapNotes">{t("notes")}</Label>
                <Textarea id="latinoMapNotes" rows={2} {...register("notes")} />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-md border border-border p-3">
              <h4 className="text-sm font-medium text-foreground">{t("dataSource")}</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sourceName">{t("sourceName")}</Label>
                  <Input id="sourceName" {...register("sourceName")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sourceUrl">{t("sourceUrl")}</Label>
                  <Input id="sourceUrl" placeholder="https://" {...register("sourceUrl")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sourceYear">{t("sourceYear")}</Label>
                  <Input id="sourceYear" type="number" {...register("sourceYear")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sourceLastUpdated">{t("sourceLastUpdated")}</Label>
                  <Input id="sourceLastUpdated" type="date" {...register("sourceLastUpdated")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sourceDataType">{t("sourceDataType")}</Label>
                  <Input id="sourceDataType" {...register("sourceDataType")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="latinoMapVerifiedBy">{t("verifiedBy")}</Label>
                  <Input id="latinoMapVerifiedBy" {...register("verifiedBy")} />
                </div>
              </div>
            </div>

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
