"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Copy, KeyRound, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDateTime } from "@/lib/dates";
import { createPartnerLinkAction, revokePartnerAccessAction } from "@/app/[locale]/(app)/alliances/partner-actions";

export type PartnerAccessSummaryView = {
  pendingLink: { expiresAt: string; locked: boolean } | null;
  activeSessions: number;
  lastSeenAt: string | null;
  lastLoginAt: string | null;
  termsAcceptedAt: string | null;
};

// Staff controls for an alliance's partner portal: personal link (shown
// once, copied and sent by WhatsApp), revoke, and when it was last used.
export function PartnerAccessCard({
  allianceId,
  hasPhone,
  summary,
  canEdit,
}: {
  allianceId: string;
  hasPhone: boolean;
  summary: PartnerAccessSummaryView;
  canEdit: boolean;
}) {
  const t = useTranslations("PartnerAccess");
  const locale = useLocale() === "en" ? "en" : "es";
  const [isPending, startTransition] = useTransition();
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await createPartnerLinkAction(allianceId, locale);
      if (result.ok) setLink({ url: result.url, expiresAt: result.expiresAt });
      else setError(result.error === "no_phone" ? t("needsPhone") : result.error === "not_active" ? t("needsActive") : t("error"));
    });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const hasAccess = summary.activeSessions > 0 || summary.pendingLink !== null;
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 font-heading text-lg text-foreground">
            <KeyRound className="h-4 w-4" aria-hidden />
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={isPending || !hasPhone} onClick={generate}>
              {hasAccess ? t("generateNew") : t("generate")}
            </Button>
            {hasAccess && (
              <ConfirmDialog
                trigger={
                  <Button type="button" size="sm" variant="outline" disabled={isPending}>
                    <ShieldOff className="h-4 w-4" />
                    {t("revoke")}
                  </Button>
                }
                title={t("revokeConfirmTitle")}
                description={t("revokeConfirmDescription")}
                confirmLabel={t("revoke")}
                confirmingLabel={t("revoking")}
                cancelLabel={t("cancel")}
                onConfirm={async () => {
                  await revokePartnerAccessAction(allianceId);
                  setLink(null);
                }}
              />
            )}
          </div>
        )}
      </div>

      {!hasPhone && <p className="text-sm text-destructive">{t("needsPhone")}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {link && (
        <div className="flex flex-col gap-2 rounded-md border border-primary/40 bg-secondary/40 p-3">
          <p className="text-sm font-medium text-foreground">{t("linkReady")}</p>
          <code className="break-all rounded bg-card p-2 text-xs text-foreground">{link.url}</code>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" variant="outline" onClick={copy}>
              <Copy className="h-4 w-4" />
              {copied ? t("copied") : t("copy")}
            </Button>
            <span className="text-xs text-muted-foreground">{t("expires", { date: formatDateTime(link.expiresAt) })}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("shownOnce")}</p>
        </div>
      )}

      <dl className="grid gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">{t("status")}</dt>
          <dd className="text-foreground">
            {summary.activeSessions > 0
              ? t("statusActive", { count: summary.activeSessions })
              : summary.pendingLink
                ? summary.pendingLink.locked
                  ? t("statusLocked")
                  : t("statusPending", { date: formatDateTime(summary.pendingLink.expiresAt) })
                : t("statusNone")}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("lastLogin")}</dt>
          <dd className="text-foreground">{summary.lastLoginAt ? formatDateTime(summary.lastLoginAt) : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("lastSeen")}</dt>
          <dd className="text-foreground">{summary.lastSeenAt ? formatDateTime(summary.lastSeenAt) : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("termsAccepted")}</dt>
          <dd className="text-foreground">{summary.termsAcceptedAt ? formatDateTime(summary.termsAcceptedAt) : "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
