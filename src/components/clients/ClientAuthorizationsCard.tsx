"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, CircleSlash, Copy, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/dates";
import { STAFF_CONSENT_METHODS, type StaffConsentMethod } from "@/lib/legal/keys";
import type { ConsentType, LatestConsent } from "@/lib/legal/texts";
import { recordStaffConsentAction } from "@/app/[locale]/(app)/clients/consent-actions";
import { createPortalLinkAction } from "@/app/[locale]/(app)/clients/portal-actions";

const SHOWN: ConsentType[] = [
  "not_a_law_firm",
  "phone_calls",
  "whatsapp",
  "sms",
  "email",
  "marketing",
  "document_processing",
  "privacy_notice",
];

// Staff can mark these by hand when the client gave permission in person,
// by phone, in writing or by message. The rest carry the client's own
// signature/confirmation and can only be accepted in the portal.
const STAFF_MARKABLE: ConsentType[] = ["phone_calls", "whatsapp", "sms", "email", "marketing"];
// The law asks for written consent for texts and promotions.
const WRITTEN_CONSENT_TYPES: ConsentType[] = ["sms", "marketing"];

type HistoryRow = {
  id: string;
  createdAt: Date;
  consentType: string;
  granted: boolean;
  source: "portal" | "online_booking" | "staff" | "sms_reply";
  ipAddress: string | null;
  signatureName: string | null;
  recordedBy: string | null;
  staffMethod: StaffConsentMethod | null;
  note: string | null;
};

// Staff view of the client's authorizations: the current state of each
// one (the latest consent event; the channel ones mirror Communication
// Preferences) and the full append-only history with date, source and IP.
// Each line opens a dialog: the five channel ones can be marked by staff,
// the client-only ones offer a portal link instead.
export function ClientAuthorizationsCard({
  clientId,
  hasPhone,
  latest,
  history,
}: {
  clientId: string;
  hasPhone: boolean;
  latest: Partial<Record<ConsentType, LatestConsent>>;
  history: HistoryRow[];
}) {
  const t = useTranslations("ClientAuthorizations");
  const [selected, setSelected] = useState<ConsentType | null>(null);
  const typeLabel = (type: string) =>
    (SHOWN as string[]).includes(type) ? t(`types.${type as ConsentType}`) : type;
  const sourceLabel = (source: HistoryRow["source"], method: StaffConsentMethod | null) =>
    source === "staff" && method
      ? t("sources.staffMethod", { method: t(`methodsInline.${method}`) })
      : t(`sources.${source}`);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        <p className="text-sm text-muted-foreground">{t("clickHint")}</p>
      </div>

      <ul className="grid gap-2 text-sm sm:grid-cols-2">
        {SHOWN.map((type) => {
          const event = latest[type];
          return (
            <li key={type}>
              <button
                type="button"
                onClick={() => setSelected(type)}
                className="flex w-full cursor-pointer items-start gap-2 rounded-md border border-border p-3 text-left transition-colors hover:border-primary/60 hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {event?.granted ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                ) : (
                  <CircleSlash className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-foreground">{typeLabel(type)}</span>
                  <span className="text-xs text-muted-foreground wrap-anywhere">
                    {event
                      ? t(event.granted ? "grantedOn" : "withdrawnOn", {
                          date: formatDateTime(event.createdAt),
                          source: sourceLabel(event.source, event.staffMethod),
                        })
                      : t("never")}
                    {event?.recordedBy ? ` · ${event.recordedBy}` : ""}
                  </span>
                  {type === "document_processing" && event?.granted && event.signatureName && (
                    <span className="text-xs text-muted-foreground">{t("signature", { name: event.signatureName })}</span>
                  )}
                </span>
                {STAFF_MARKABLE.includes(type) ? (
                  <Pencil className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {history.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-primary underline">{t("history", { count: history.length })}</summary>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {history.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                <span className="text-muted-foreground">{formatDateTime(row.createdAt)}</span>
                <span className="text-foreground">
                  {typeLabel(row.consentType)}: {row.granted ? t("granted") : t("withdrawn")}
                </span>
                <span className="text-xs text-muted-foreground wrap-anywhere">
                  {sourceLabel(row.source, row.staffMethod)}
                  {row.recordedBy ? ` · ${row.recordedBy}` : ""}
                  {row.ipAddress ? ` · IP ${row.ipAddress}` : ""}
                  {row.signatureName ? ` · ${t("signature", { name: row.signatureName })}` : ""}
                  {row.note ? ` · ${t("noteInline", { note: row.note })}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && STAFF_MARKABLE.includes(selected) && (
            <StaffConsentForm
              key={selected}
              clientId={clientId}
              type={selected}
              typeLabel={typeLabel(selected)}
              currentlyGranted={latest[selected]?.granted ?? false}
              onDone={() => setSelected(null)}
            />
          )}
          {selected && !STAFF_MARKABLE.includes(selected) && (
            <ClientOnlyNotice
              key={selected}
              clientId={clientId}
              hasPhone={hasPhone}
              typeLabel={typeLabel(selected)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StaffConsentForm({
  clientId,
  type,
  typeLabel,
  currentlyGranted,
  onDone,
}: {
  clientId: string;
  type: ConsentType;
  typeLabel: string;
  currentlyGranted: boolean;
  onDone: () => void;
}) {
  const t = useTranslations("ClientAuthorizations.dialog");
  const tMethod = useTranslations("ClientAuthorizations.methods");
  const [granted, setGranted] = useState<boolean>(!currentlyGranted);
  const [method, setMethod] = useState<StaffConsentMethod | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    if (!method) {
      setError(t("chooseMethod"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await recordStaffConsentAction({ clientId, type, granted, method, note });
      if (result.ok) {
        toast.success(t("saved"));
        onDone();
      } else {
        setError(t("error"));
      }
    });
  }

  const choice = (active: boolean) =>
    active
      ? "border-primary bg-secondary text-foreground"
      : "border-border text-muted-foreground hover:bg-secondary/40";

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{typeLabel}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("title")}>
          {[true, false].map((value) => (
            <button
              key={String(value)}
              type="button"
              role="radio"
              aria-checked={granted === value}
              onClick={() => setGranted(value)}
              className={`rounded-md border p-2 text-sm font-medium ${choice(granted === value)}`}
            >
              {value ? t("granted") : t("withdrawn")}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("howLabel")}</Label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("howLabel")}>
            {STAFF_CONSENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={method === m}
                onClick={() => {
                  setMethod(m);
                  setError(null);
                }}
                className={`rounded-md border p-2 text-sm ${choice(method === m)}`}
              >
                {tMethod(m)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staff-consent-note">{t("noteLabel")}</Label>
          <Textarea
            id="staff-consent-note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {WRITTEN_CONSENT_TYPES.includes(type) && (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            {t("writtenNotice")}
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
          {t("cancel")}
        </Button>
        <Button type="button" onClick={save} disabled={isPending}>
          {isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </>
  );
}

function ClientOnlyNotice({
  clientId,
  hasPhone,
  typeLabel,
}: {
  clientId: string;
  hasPhone: boolean;
  typeLabel: string;
}) {
  const t = useTranslations("ClientAuthorizations.clientOnly");
  const tAccess = useTranslations("PortalAccess");
  const [isPending, startTransition] = useTransition();
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const result = await createPortalLinkAction(clientId);
      if (result.ok) setLink({ url: result.url, expiresAt: result.expiresAt });
      else setError(result.error === "no_phone" ? tAccess("needsPhone") : tAccess("error"));
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

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription>{typeLabel}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 text-sm">
        <p className="text-muted-foreground">{t("description")}</p>
        {!hasPhone && <p className="text-destructive">{tAccess("needsPhone")}</p>}
        {error && <p className="text-destructive">{error}</p>}
        {link && (
          <div className="flex flex-col gap-2 rounded-md border border-primary/40 bg-secondary/40 p-3">
            <p className="font-medium text-foreground">{tAccess("linkReady")}</p>
            <code className="break-all rounded bg-card p-2 text-xs text-foreground">{link.url}</code>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" size="sm" variant="outline" onClick={copy}>
                <Copy className="h-4 w-4" />
                {copied ? tAccess("copied") : tAccess("copy")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {tAccess("expires", { date: formatDateTime(link.expiresAt) })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{tAccess("shownOnce")}</p>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" onClick={generate} disabled={isPending || !hasPhone}>
          {t("generateLink")}
        </Button>
      </DialogFooter>
    </>
  );
}
