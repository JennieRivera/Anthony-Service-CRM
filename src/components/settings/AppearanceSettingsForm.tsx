"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAccent, accentValues, type AccentValue } from "@/components/theme/AccentProvider";

// Phase 1.5C/1.5D — Settings → Appearance. Two independent axes: next-themes'
// light/dark/system mode, and this project's own CRM Accent Color
// (AccentProvider). The preview section needs no simulated rendering —
// it's built from the same real CRM components (Button, Badge, a link),
// so it reflects the actual global CSS variables live as soon as either
// control changes. Swatches show the literal official brand hex (not the
// deepened text-bearing fill actually used for buttons), matching the
// "decorative, non-text use" half of each brand color.
const ACCENT_SWATCH: Record<AccentValue, string> = {
  sage: "#82A98F",
  teal: "#A8D2CB",
  gold: "#C8A96B",
};

const ACCENT_LABEL_KEY: Record<AccentValue, string> = {
  sage: "accentSage",
  teal: "accentTeal",
  gold: "accentGold",
};

function subscribeNever() {
  return () => {};
}

// next-themes' theme value isn't known until after hydration (the server
// has no localStorage) — useSyncExternalStore is the lint-clean way to
// detect "has this mounted on the client yet" without a set-state-in-effect.
function useMounted() {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}

export function AppearanceSettingsForm() {
  const t = useTranslations("Appearance");
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const mounted = useMounted();

  const modeOptions: { value: string; labelKey: string; icon: typeof Sun }[] = [
    { value: "light", labelKey: "modeLight", icon: Sun },
    { value: "dark", labelKey: "modeDark", icon: Moon },
    { value: "system", labelKey: "modeSystem", icon: Monitor },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">{t("modeTitle")}</h2>
        <div className="flex flex-wrap gap-2">
          {modeOptions.map(({ value, labelKey, icon: Icon }) => (
            <Button
              key={value}
              type="button"
              variant={mounted && theme === value ? "default" : "outline"}
              onClick={() => setTheme(value)}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">{t("accentTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("accentDescription")}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setAccent(null)}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
              !accent ? "border-foreground bg-secondary" : "border-border hover:bg-secondary/50",
            )}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/10"
              style={{ backgroundColor: "#4F7FA8" }}
            >
              {!accent && <Check className="h-3 w-3 text-[#fdfbf6]" />}
            </span>
            {t("accentDefault")}
          </button>
          {accentValues.map((value) => {
            const selected = accent === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setAccent(selected ? null : value)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                  selected
                    ? "border-foreground bg-secondary"
                    : "border-border hover:bg-secondary/50",
                )}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-black/10"
                  style={{ backgroundColor: ACCENT_SWATCH[value] }}
                >
                  {selected && <Check className="h-3 w-3 text-[#1c2b3e]" />}
                </span>
                {t(ACCENT_LABEL_KEY[value])}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">{t("previewTitle")}</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="button">{t("previewButton")}</Button>
          <a href="#" onClick={(e) => e.preventDefault()} className="text-primary underline">
            {t("previewLink")}
          </a>
          <Badge variant="default">{t("previewBadge")}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <Badge className="border-transparent bg-success text-success-foreground">
            {t("previewSuccess")}
          </Badge>
          <Badge className="border-transparent bg-premium text-premium-foreground">
            {t("previewPremium")}
          </Badge>
          <span className="rounded-md bg-info/20 px-2.5 py-1 text-sm text-info-foreground dark:bg-info">
            {t("previewInfo")}
          </span>
        </div>
      </div>
    </div>
  );
}
