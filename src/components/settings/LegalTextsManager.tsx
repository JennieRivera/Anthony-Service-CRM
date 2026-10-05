"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saveLegalTextsAction } from "@/app/[locale]/(app)/settings/legal-texts/actions";
import { LEGAL_TEXT_KEYS, type LegalTexts } from "@/lib/legal/keys";

export function LegalTextsManager({ texts, defaults }: { texts: LegalTexts; defaults: LegalTexts }) {
  const t = useTranslations("LegalTexts");
  const [draft, setDraft] = useState<LegalTexts>(texts);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function update(key: keyof LegalTexts, lang: "en" | "es", value: string) {
    setDraft((d) => ({ ...d, [key]: { ...d[key], [lang]: value } }));
    setMessage(null);
  }

  function save() {
    startTransition(async () => {
      try {
        await saveLegalTextsAction(draft);
        setMessage({ kind: "ok", text: t("saved") });
      } catch (err) {
        setMessage({ kind: "error", text: err instanceof Error ? err.message : t("error") });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {LEGAL_TEXT_KEYS.map((key) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle>{t(`keys.${key}.title`)}</CardTitle>
            <p className="text-sm text-muted-foreground">{t(`keys.${key}.help`)}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {(["es", "en"] as const).map((lang) => (
              <div key={lang} className="flex flex-col gap-1.5">
                <Label htmlFor={`${key}-${lang}`}>{lang === "es" ? t("spanish") : t("english")}</Label>
                <Textarea
                  id={`${key}-${lang}`}
                  rows={key === "not_a_law_firm_ack" ? 2 : 5}
                  maxLength={4000}
                  value={draft[key][lang]}
                  onChange={(e) => update(key, lang, e.target.value)}
                />
              </div>
            ))}
            {defaults[key].en !== "" && (
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    update(key, "en", defaults[key].en);
                    update(key, "es", defaults[key].es);
                  }}
                >
                  {t("restoreDefault")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-end gap-3">
        {message && (
          <p className={message.kind === "ok" ? "text-sm text-muted-foreground" : "text-sm text-destructive"} role="status">
            {message.text}
          </p>
        )}
        <Button type="button" disabled={isPending} onClick={save}>
          {isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
