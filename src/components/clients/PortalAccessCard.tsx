"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Copy, KeyRound, Mail, MessageSquare, ShieldOff } from "lucide-react";
import { openClientTab } from "./ClientProfileTabs";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDateTime } from "@/lib/dates";
import {
  createPortalLinkAction,
  revokePortalAccessAction,
  sendPortalLinkAction,
} from "@/app/[locale]/(app)/clients/portal-actions";

// Why a send button is off (null = ready). See portalLinkSendBlocks.
export type SendBlock = "provider_off" | "no_contact" | "no_consent" | "blocked" | "notices_off" | null;

export type PortalAccessSummaryView = {
  pendingLink: { createdAt: string; expiresAt: string; locked: boolean } | null;
  activeSessions: number;
  lastSeenAt: string | null;
  lastLoginAt: string | null;
};

// Staff controls for a client's portal access: generate a personal link
// (shown once, copied and sent by WhatsApp), revoke all access, and see
// when the client last used the portal.
export function PortalAccessCard({
  clientId,
  hasPhone,
  summary,
  sendBlocks,
  noticesTestMode = false,
}: {
  clientId: string;
  hasPhone: boolean;
  summary: PortalAccessSummaryView;
  // Step 3B: per channel, why the link can't be sent through it right now
  // (null = authorized by the client, contact data present, provider on).
  sendBlocks: { sms: SendBlock; email: SendBlock };
  noticesTestMode?: boolean;
}) {
  const t = useTranslations("PortalAccess");
  const [isPending, startTransition] = useTransition();
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  function send(channel: "sms" | "email") {
    setError(null);
    setSent(null);
    setLink(null);
    startTransition(async () => {
      const result = await sendPortalLinkAction(clientId, channel);
      if (result.ok) {
        setSent(result.testMode ? t("sentTestMode") : t(channel === "sms" ? "sentSms" : "sentEmail"));
      } else {
        setError(t(`sendErrors.${result.error}`));
      }
    });
  }

  function generate() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await createPortalLinkAction(clientId);
      if (result.ok) setLink({ url: result.url, expiresAt: result.expiresAt });
      else setError(result.error === "no_phone" ? t("needsPhone") : t("error"));
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
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={isPending || !hasPhone} onClick={generate}>
            {summary.pendingLink || summary.activeSessions > 0 ? t("generateNew") : t("generate")}
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
                await revokePortalAccessAction(clientId);
                setLink(null);
              }}
            />
          )}
        </div>
      </div>

      {hasPhone && (
        <p className="rounded-md border border-primary/40 bg-secondary/40 p-3 text-sm font-medium text-foreground">
          {t("whatsappTip")}
        </p>
      )}

      {hasPhone && (
        <div className="flex flex-col gap-2 rounded-md border border-border p-3">
          <p className="text-sm font-medium text-foreground">{t("sendTitle")}</p>
          <div className="flex flex-col gap-2">
            {(["sms", "email"] as const).map((channel) => {
              const block = sendBlocks[channel];
              return (
                <div key={channel} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isPending || block !== null}
                    onClick={() => send(channel)}
                  >
                    {channel === "sms" ? <MessageSquare className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                    {t(channel === "sms" ? "sendSms" : "sendEmail")}
                  </Button>
                  {block && (
                    <span className="text-xs text-muted-foreground">
                      {t(`sendBlocked.${channel}.${block}`)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("sendHelp")}
            {noticesTestMode && ` ${t("sendTestModeNote")}`}
          </p>
          {(sendBlocks.sms === "no_consent" || sendBlocks.email === "no_consent") && (
            <p className="text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => openClientTab("preferences")}
                className="cursor-pointer font-medium text-primary underline"
              >
                {t("markAuthorization")}
              </button>{" "}
              {t("markAuthorizationNote")}
            </p>
          )}
        </div>
      )}

      {!hasPhone && <p className="text-sm text-destructive">{t("needsPhone")}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {sent && <p className="text-sm text-foreground" role="status">{sent}</p>}

      {link && (
        <div className="flex flex-col gap-2 rounded-md border border-primary/40 bg-secondary/40 p-3">
          <p className="text-sm font-medium text-foreground">{t("linkReady")}</p>
          <code className="break-all rounded bg-card p-2 text-xs text-foreground">{link.url}</code>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" size="sm" variant="outline" onClick={copy}>
              <Copy className="h-4 w-4" />
              {copied ? t("copied") : t("copy")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("expires", { date: formatDateTime(link.expiresAt) })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{t("shownOnce")}</p>
        </div>
      )}

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
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
      </dl>
    </section>
  );
}
