"use client";

import { useMemo, type ReactNode } from "react";
import { USAMap, StateAbbreviations } from "@mirawision/usa-map-react";
import { USStateFlags } from "us-state-flags";
import {
  stateMapCentroids,
  CROWDED_MAP_STATES,
  MAP_VIEWBOX_WIDTH,
  MAP_VIEWBOX_HEIGHT,
} from "@/lib/data/stateMapCentroids";

// Phase 5, Session 2 — generic US map, extracted from the Company
// Registration map built in Phase 2 (same SVG/centroid/flag-overlay
// mechanics, none of it specific to that feature). Each map that needs it
// (Company Registration, and the Sales Tax and Latino Business Opportunity
// maps planned for later Phase 5 sessions) supplies its own per-state
// color/click/tooltip and renders this component — nothing here is
// duplicated per map.
export type UsaStateMapStateConfig = {
  fill: string;
  stroke: string;
  onClick?: () => void;
  tooltip?: ReactNode;
};

export function UsaStateMap({
  states,
  defaultState = { fill: "#F5F3EC", stroke: "#C9C3B4" },
  showFlags = false,
}: {
  states: Record<string, UsaStateMapStateConfig>;
  defaultState?: { fill: string; stroke: string };
  // Official state-government flags make sense for maps about state
  // agencies/portals (Company Registration, Sales Tax) but not for a
  // demographic/opportunity map (Latino Business) — off by default.
  showFlags?: boolean;
}) {
  const customStates = useMemo(() => {
    const settings: Record<
      string,
      {
        fill: string;
        stroke: string;
        onClick?: () => void;
        label?: { enabled: boolean; render?: () => ReactNode };
        tooltip?: { enabled: boolean; render: () => ReactNode };
      }
    > = {};

    for (const [abbr, config] of Object.entries(states)) {
      settings[abbr] = {
        fill: config.fill,
        stroke: config.stroke,
        onClick: config.onClick,
        // States with an on-map flag icon (see the overlay below) get their
        // abbreviation nudged down a few SVG units so the flag sitting
        // above it doesn't overlap the text. Crowded Northeast states skip
        // the on-map icon entirely, so their label stays untouched.
        label: {
          enabled: true,
          render:
            showFlags && !CROWDED_MAP_STATES.has(abbr)
              ? () => <tspan dy={7}>{abbr}</tspan>
              : undefined,
        },
        tooltip: config.tooltip
          ? { enabled: true, render: () => config.tooltip }
          : undefined,
      };
    }

    return settings;
  }, [states, showFlags]);

  return (
    <div className="relative w-full">
      <USAMap
        customStates={customStates}
        mapSettings={{ width: "100%", height: "auto" }}
        defaultState={defaultState}
      />
      {showFlags && (
        <div className="pointer-events-none absolute inset-0">
          {StateAbbreviations.filter(
            (abbr) => states[abbr] && !CROWDED_MAP_STATES.has(abbr),
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
      )}
    </div>
  );
}
