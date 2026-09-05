"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  testIntegrationConnectionAction,
  disconnectIntegrationAction,
  updateIntegrationNotesAction,
} from "@/app/[locale]/(app)/settings/integrations/actions";
import type { listIntegrationSettings } from "@/lib/queries/integrationSettings";

const statusClasses: Record<string, string> = {
  not_connected: "border-border text-muted-foreground bg-transparent",
  ready: "border-transparent bg-accent/20 text-foreground",
  connected: "border-transparent bg-primary text-primary-foreground",
  syncing: "border-transparent bg-accent/20 text-foreground",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  paused: "border-border text-muted-foreground bg-transparent",
};

type Integration = Awaited<ReturnType<typeof listIntegrationSettings>>[number];

// Phase 4, Session 7 — "security warnings if an integration is configured
// without recommended protections" (spec #19). The recommended protection
// checked here is accountability: a live/ready connection with no
// Connected Account recorded means nobody has documented who or what
// authorized it, which is a real audit-trail gap even before any API key
// exists. An error status is always worth flagging too.
function getSecurityWarning(integration: Integration): string | null {
  if (integration.status === "error") return "error";
  if (
    ["connected", "ready", "syncing"].includes(integration.status) &&
    !integration.connectedAccount
  ) {
    return "missingAccount";
  }
  return null;
}

export function IntegrationCard({ integration }: { integration: Integration }) {
  const t = useTranslations("Integrations");
  const tStatus = useTranslations("IntegrationSyncStatus");
  const tType = useTranslations("IntegrationConnectionType");
  const [notes, setNotes] = useState(integration.notes ?? "");
  const [isPending, startTransition] = useTransition();
  const [savedNotes, setSavedNotes] = useState(false);
  const warning = getSecurityWarning(integration);

  function testConnection() {
    startTransition(async () => {
      await testIntegrationConnectionAction(integration.key);
    });
  }

  function disconnect() {
    startTransition(async () => {
      await disconnectIntegrationAction(integration.key);
    });
  }

  function saveNotes() {
    startTransition(async () => {
      await updateIntegrationNotesAction(integration.key, notes);
      setSavedNotes(true);
      setTimeout(() => setSavedNotes(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-base text-foreground">
          {t(`names.${integration.key}`)}
        </h3>
        <Badge className={cn(statusClasses[integration.status])}>
          {tStatus(integration.status)}
        </Badge>
      </div>

      {warning && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {warning === "error" ? t("warningError") : t("warningMissingAccount")}
          </span>
        </div>
      )}

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground">{t("connectionType")}</p>
          <p className="text-foreground">{tType(integration.connectionType)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("connectedAccount")}</p>
          <p className="text-foreground">{integration.connectedAccount ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("lastSync")}</p>
          <p className="text-foreground">
            {integration.lastSyncAt
              ? new Date(integration.lastSyncAt).toLocaleString()
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("lastError")}</p>
          <p className={integration.lastError ? "text-destructive" : "text-foreground"}>
            {integration.lastError ?? "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted-foreground" htmlFor={`notes-${integration.key}`}>
          {t("notes")}
        </label>
        <Textarea
          id={`notes-${integration.key}`}
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          placeholder={t("notesPlaceholder")}
        />
        {savedNotes && (
          <span className="text-xs text-muted-foreground">{t("notesSaved")}</span>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={disconnect}
        >
          {t("disconnect")}
        </Button>
        <Button type="button" size="sm" disabled={isPending} onClick={testConnection}>
          {t("testConnection")}
        </Button>
      </div>
    </div>
  );
}
