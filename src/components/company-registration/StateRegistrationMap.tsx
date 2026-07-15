"use client";

import { useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { USAMap, StateAbbreviations } from "@mirawision/usa-map-react";
import { stateBusinessLinks } from "@/lib/data/stateBusinessLinks";

export function StateRegistrationMap() {
  const t = useTranslations("CompanyRegistration");
  const locale = useLocale() as "en" | "es";

  const customStates = useMemo(() => {
    const settings: Record<
      string,
      {
        fill: string;
        stroke: string;
        onClick: () => void;
        label?: { enabled: boolean };
        tooltip?: {
          enabled: boolean;
          render: () => ReactNode;
        };
      }
    > = {};

    StateAbbreviations.forEach((abbr) => {
      const info = stateBusinessLinks[abbr];
      if (!info) return;

      settings[abbr] = {
        fill: "#E4E0D6",
        stroke: "#0F1A2B",
        onClick: () => {
          window.open(info.url, "_blank", "noopener,noreferrer");
        },
        label: { enabled: true },
        tooltip: {
          enabled: true,
          render: () => (
            <div style={{ fontSize: 12, padding: 2 }}>
              <strong>{info.name[locale]}</strong>
              <br />
              {t("clickToOpen")}
            </div>
          ),
        },
      };
    });

    return settings;
  }, [locale, t]);

  return (
    <div className="w-full">
      <USAMap
        customStates={customStates}
        mapSettings={{ width: "100%", height: "auto" }}
        defaultState={{ fill: "#F5F3EC", stroke: "#C9C3B4" }}
      />
    </div>
  );
}
