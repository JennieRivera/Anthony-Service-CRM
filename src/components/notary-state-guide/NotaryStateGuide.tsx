"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { StateAbbreviations, StateNames } from "@mirawision/usa-map-react";
import { USStateFlags } from "us-state-flags";
import {
  UsaStateMap,
  type UsaStateMapStateConfig,
} from "@/components/maps/UsaStateMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { NotaryStateGuide as NotaryStateGuideRow } from "@/lib/db/schema";
import "./notary-state-guide.css";

function isUrl(value: string | null | undefined): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

export function NotaryStateGuide({
  data,
}: {
  data: Record<string, NotaryStateGuideRow>;
}) {
  const t = useTranslations("NotaryStateGuide");
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return StateAbbreviations.filter(
      (abbr) =>
        StateNames[abbr].toLowerCase().includes(q) ||
        abbr.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [query]);

  const mapStates = useMemo(() => {
    const settings: Record<string, UsaStateMapStateConfig> = {};
    StateAbbreviations.forEach((abbr) => {
      settings[abbr] = {
        fill: "var(--ng-sky)",
        stroke: "var(--ng-silver)",
        onClick: () => setSelectedState(abbr),
        // Only the hovered state's tooltip renders at once, so this can be
        // noticeably bigger than the map's always-on 50-state flag overlay
        // (rendered separately via UsaStateMap's own showFlags prop).
        tooltip: (
          <div className="flex items-center gap-2 p-1">
            <USStateFlags state={abbr} showFlag flagSize="sm" />
            <div className="flex flex-col leading-tight">
              <strong>{StateNames[abbr]}</strong>
              <span className="text-xs text-muted-foreground">{abbr}</span>
            </div>
          </div>
        ),
      };
    });
    return settings;
  }, []);

  const selected = selectedState ? data[selectedState] : undefined;

  function openState(abbr: string) {
    setSelectedState(abbr);
    setQuery("");
  }

  return (
    <div className="notary-guide-scope flex flex-col gap-6 rounded-xl border border-[var(--ng-silver)] bg-gradient-to-b from-[var(--ng-sky)] to-[var(--ng-white)] p-6 sm:p-8">
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <span className="text-xs font-semibold tracking-wide text-[var(--ng-ink)] uppercase">
          {t("eyebrow")}
        </span>
        <h1 className="font-heading text-2xl text-[var(--ng-ink)] sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-sm text-[var(--ng-ink)]/80">{t("subhead")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="bg-[var(--ng-white)]"
          />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-[var(--ng-silver)] bg-[var(--ng-white)] shadow-md">
              {suggestions.map((abbr) => (
                <button
                  key={abbr}
                  type="button"
                  onClick={() => openState(abbr)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--ng-sky)]"
                >
                  <USStateFlags state={abbr} showFlag flagSize="xs" />
                  {StateNames[abbr]} ({abbr})
                </button>
              ))}
            </div>
          )}
        </div>

        <Select
          value={selectedState ?? undefined}
          onValueChange={(value) => value && openState(value)}
        >
          <SelectTrigger className="w-full bg-[var(--ng-white)] sm:w-56">
            <SelectValue placeholder={t("selectPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {StateAbbreviations.map((abbr) => (
              <SelectItem key={abbr} value={abbr}>
                {StateNames[abbr]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Map on md+ screens; a plain searchable state list replaces it below
          md rather than forcing the SVG into a tiny viewport. */}
      <div className="hidden md:block">
        <UsaStateMap
          states={mapStates}
          showFlags
          defaultState={{ fill: "var(--ng-sky)", stroke: "var(--ng-silver)" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:hidden">
        {StateAbbreviations.map((abbr) => (
          <button
            key={abbr}
            type="button"
            onClick={() => openState(abbr)}
            className="flex items-center gap-2 rounded-lg border border-[var(--ng-silver)] bg-[var(--ng-white)] px-3 py-2 text-left text-sm"
          >
            <USStateFlags state={abbr} showFlag flagSize="xs" />
            {abbr}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {t("disclaimer")}
      </p>

      <Dialog
        open={selectedState !== null}
        onOpenChange={(open) => !open && setSelectedState(null)}
      >
        <DialogContent className="sm:max-w-md">
          {selectedState && (
            <>
              <DialogHeader className="items-center text-center">
                <div className="overflow-hidden rounded-xl border-2 border-[var(--ng-gold)] shadow-lg">
                  <USStateFlags state={selectedState} showFlag flagSize="lg" />
                </div>
                <DialogTitle className="mt-2 text-xl">
                  {StateNames[selectedState]} ({selectedState})
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {t("resourcesLabel")}
                </p>
              </DialogHeader>

              <dl className="flex flex-col gap-3 text-sm">
                <InfoRow label={t("officialAgency")} value={selected?.officialAgency} notFoundLabel={t("notFound")} />
                <InfoRow label={t("officialWebsite")} value={selected?.officialWebsite} notFoundLabel={t("notFound")} />
                <InfoRow label={t("commissionLink")} value={selected?.commissionLink} notFoundLabel={t("notFound")} />
                <InfoRow label={t("examLink")} value={selected?.examLink} notFoundLabel={t("notFound")} />
                <InfoRow label={t("requirementsLink")} value={selected?.requirementsLink} notFoundLabel={t("notFound")} />
              </dl>

              {selected?.officialWebsite && (
                <Button
                  render={
                    <a
                      href={selected.officialWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                  className="w-full"
                >
                  {t("openOfficialWebsite")}
                </Button>
              )}

              <p className="text-center text-xs text-muted-foreground">
                {t("verifyNote")}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
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
    <div className="flex flex-col gap-0.5 border-b border-[var(--ng-silver)]/50 pb-2">
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
            className="text-[var(--ng-sky-deep)] underline"
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
