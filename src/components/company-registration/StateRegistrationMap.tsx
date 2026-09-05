"use client";

import { useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { USAMap, StateAbbreviations } from "@mirawision/usa-map-react";
import { USStateFlags } from "us-state-flags";
import { stateBusinessLinks } from "@/lib/data/stateBusinessLinks";
import {
  stateMapCentroids,
  CROWDED_MAP_STATES,
  MAP_VIEWBOX_WIDTH,
  MAP_VIEWBOX_HEIGHT,
} from "@/lib/data/stateMapCentroids";

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
        label?: { enabled: boolean; render?: () => ReactNode };
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
        // States with an on-map flag icon (see the overlay below) get their
        // abbreviation nudged down a few SVG units so the flag sitting above
        // it doesn't overlap the text. Crowded Northeast states skip the
        // on-map icon entirely, so their label stays untouched.
        label: {
          enabled: true,
          render: CROWDED_MAP_STATES.has(abbr)
            ? undefined
            : () => <tspan dy={7}>{abbr}</tspan>,
        },
        tooltip: {
          enabled: true,
          render: () => (
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
        },
      };
    });

    return settings;
  }, [locale, t]);

  return (
    <div className="relative w-full">
      <USAMap
        customStates={customStates}
        mapSettings={{ width: "100%", height: "auto" }}
        defaultState={{ fill: "#F5F3EC", stroke: "#C9C3B4" }}
      />
      <div className="pointer-events-none absolute inset-0">
        {StateAbbreviations.filter(
          (abbr) => stateBusinessLinks[abbr] && !CROWDED_MAP_STATES.has(abbr),
        ).map((abbr) => {
          const centroid = stateMapCentroids[abbr];
          if (!centroid) return null;

          return (
            <div
              key={abbr}
              className="absolute"
              style={{
                left: `${(centroid.x / MAP_VIEWBOX_WIDTH) * 100}%`,
                top: `${(centroid.y / MAP_VIEWBOX_HEIGHT) * 100}%`,
                transform: "translate(-50%, calc(-50% - 9px))",
              }}
            >
              <USStateFlags state={abbr} showFlag flagSize="xs" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
