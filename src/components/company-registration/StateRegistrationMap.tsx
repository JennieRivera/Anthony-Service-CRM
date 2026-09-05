"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { StateAbbreviations } from "@mirawision/usa-map-react";
import { USStateFlags } from "us-state-flags";
import { UsaStateMap, type UsaStateMapStateConfig } from "@/components/maps/UsaStateMap";
import { stateBusinessLinks } from "@/lib/data/stateBusinessLinks";

export function StateRegistrationMap() {
  const t = useTranslations("CompanyRegistration");
  const locale = useLocale() as "en" | "es";

  const states = useMemo(() => {
    const settings: Record<string, UsaStateMapStateConfig> = {};

    StateAbbreviations.forEach((abbr) => {
      const info = stateBusinessLinks[abbr];
      if (!info) return;

      settings[abbr] = {
        fill: "#E4E0D6",
        stroke: "#0F1A2B",
        onClick: () => {
          window.open(info.url, "_blank", "noopener,noreferrer");
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

  return (
    <UsaStateMap
      states={states}
      defaultState={{ fill: "#F5F3EC", stroke: "#C9C3B4" }}
      showFlags
    />
  );
}
