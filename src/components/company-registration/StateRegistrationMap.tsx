"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { StateAbbreviations } from "@mirawision/usa-map-react";
import { USStateFlags } from "us-state-flags";
import { UsaStateMap, type UsaStateMapStateConfig } from "@/components/maps/UsaStateMap";
import { stateBusinessLinks } from "@/lib/data/stateBusinessLinks";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStateBusinessSummaryAction } from "@/app/[locale]/(app)/company-registration/actions";
import type { StateBusinessSummary } from "@/lib/queries/stateBusinessSummary";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function StateRegistrationMap() {
  const t = useTranslations("CompanyRegistration");
  const tService = useTranslations("ServiceType");
  const tScore = useTranslations("LatinoOpportunityScore");
  const locale = useLocale() as "en" | "es";
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [summary, setSummary] = useState<StateBusinessSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const states = useMemo(() => {
    const settings: Record<string, UsaStateMapStateConfig> = {};

    StateAbbreviations.forEach((abbr) => {
      const info = stateBusinessLinks[abbr];
      if (!info) return;

      settings[abbr] = {
        fill: "#E4E0D6",
        stroke: "#0F1A2B",
        onClick: () => {
          setSelectedState(abbr);
          setSummary(null);
          setLoading(true);
          getStateBusinessSummaryAction(abbr).then((result) => {
            setSummary(result);
            setLoading(false);
          });
        },
        tooltip: (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              padding: 2,
            }}
          >
            <USStateFlags state={abbr} showFlag flagSize="sm" />
            <div>
              <strong>{info.name[locale]}</strong>
              <br />
              {t("clickToOpen")}
            </div>
          </div>
        ),
      };
    });

    return settings;
  }, [locale, t]);

  const info = selectedState ? stateBusinessLinks[selectedState] : undefined;

  return (
    <>
      <UsaStateMap
        states={states}
        defaultState={{ fill: "#F5F3EC", stroke: "#C9C3B4" }}
        showFlags
      />

      <Dialog
        open={selectedState !== null}
        onOpenChange={(open) => !open && setSelectedState(null)}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {info?.name[locale] ?? selectedState} — {t("businessSummary")}
            </DialogTitle>
          </DialogHeader>

          {loading && (
            <p className="text-sm text-muted-foreground">{t("loadingSummary")}</p>
          )}

          {!loading && summary && (
            <div className="flex flex-col gap-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">{t("companiesByState")}</p>
                  <p className="text-foreground">{summary.companiesCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("clientsByState")}</p>
                  <p className="text-foreground">{summary.clientsCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("revenueByState")}</p>
                  <p className="text-foreground">{formatMoney(summary.revenuePaid)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("salesTaxClients")}</p>
                  <p className="text-foreground">{summary.salesTaxClientsCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("rriReferrals")}</p>
                  <p className="text-foreground">{summary.rriReferralsCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">
                    {t("associationsAndChambers")}
                  </p>
                  <p className="text-foreground">
                    {summary.associationsCount} / {summary.chambersCount}
                  </p>
                </div>
              </div>

              {summary.topServiceTypes.length > 0 && (
                <div>
                  <p className="text-muted-foreground">{t("serviceDemand")}</p>
                  <p className="text-foreground">
                    {summary.topServiceTypes
                      .map((s) => `${tService(s.serviceType)} (${s.count})`)
                      .join(", ")}
                  </p>
                </div>
              )}

              <div>
                <p className="text-muted-foreground">
                  {t("latinoBusinessOpportunity")}
                </p>
                <p className="text-foreground">
                  {summary.latinoOpportunity
                    ? tScore(summary.latinoOpportunity.score)
                    : tScore("insufficient_data")}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/sales-tax-map?state=${selectedState}`} />}
                >
                  {t("viewSalesTaxMap")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/latino-business-map?state=${selectedState}`} />}
                >
                  {t("viewLatinoBusinessMap")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/associations?state=${selectedState}`} />}
                >
                  {t("viewAssociations")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href={`/companies?state=${selectedState}`} />}
                >
                  {t("viewCompanies")}
                </Button>
              </div>

              {info && (
                <a
                  href={info.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-foreground underline"
                >
                  {t("openRegistrationLink")}
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
