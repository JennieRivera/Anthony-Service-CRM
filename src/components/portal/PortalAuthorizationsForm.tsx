"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PORTAL_AUTHORIZATIONS, type PortalAuthorization } from "@/lib/portal/authorizationTypes";
import { formatPortalShortDate, formatPortalTime } from "@/lib/portal/display";

export type AuthorizationItem = {
  granted: boolean;
  at: string | null;
  signatureName?: string | null;
};

// My authorizations — seven boxes the client can accept or withdraw.
// Saved together; the server records only the boxes that changed.
export function PortalAuthorizationsForm({
  initial,
  documentProcessingText,
  fullName,
}: {
  initial: Record<PortalAuthorization, AuthorizationItem>;
  documentProcessingText: string;
  fullName: string;
}) {
  const t = useTranslations("Portal.authorizations");
  const locale = useLocale();
  const router = useRouter();
  const [choices, setChoices] = useState<Record<PortalAuthorization, boolean>>(
    () => Object.fromEntries(PORTAL_AUTHORIZATIONS.map((a) => [a, initial[a].granted])) as Record<PortalAuthorization, boolean>,
  );
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "saved" } | { kind: "error"; message: string }>({ kind: "idle" });

  const needsSignature = choices.document_processing && !initial.document_processing.granted;
  const dirty = PORTAL_AUTHORIZATIONS.some((a) => choices[a] !== initial[a].granted);

  async function save() {
    if (needsSignature && signature.trim().length < 2) {
      setStatus({ kind: "error", message: t("errors.signature") });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/portal/authorizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choices, signatureName: needsSignature ? signature : "", locale }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const message =
          data.error === "signature" ? t("errors.signature") : data.error === "limit_reached" ? t("errors.limit") : t("errors.generic");
        setStatus({ kind: "error", message });
        return;
      }
      setSignature("");
      setStatus({ kind: "saved" });
      router.refresh();
    } catch {
      setStatus({ kind: "error", message: t("errors.generic") });
    } finally {
      setBusy(false);
    }
  }

  const when = (iso: string | null) =>
    iso ? t("lastChanged", { date: formatPortalShortDate(iso, locale), time: formatPortalTime(iso) }) : null;

  const label = (a: PortalAuthorization) => {
    if (a === "document_processing") return documentProcessingText;
    if (a === "privacy_notice") {
      return t.rich("items.privacy_notice.labelWithLink", {
        link: (chunks) => (
          <Link href="/privacy" target="_blank" className="text-primary underline">
            {chunks}
          </Link>
        ),
      });
    }
    return t(`items.${a}.label`);
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {PORTAL_AUTHORIZATIONS.map((a) => {
          const id = `authorization-${a}`;
          const changedAt = when(initial[a].at);
          return (
            <li key={a} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={id}
                  className="mt-0.5 size-5"
                  checked={choices[a]}
                  onCheckedChange={(v) => {
                    setChoices((c) => ({ ...c, [a]: v === true }));
                    setStatus({ kind: "idle" });
                  }}
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <Label htmlFor={id} className="cursor-pointer text-base font-normal leading-snug text-foreground">
                    {label(a)}
                  </Label>
                  {a === "marketing" && <span className="text-sm text-muted-foreground">{t("items.marketing.help")}</span>}
                  {a === "sms" && <span className="text-sm text-muted-foreground">{t("items.sms.help")}</span>}
                  {a === "document_processing" && initial.document_processing.granted && initial.document_processing.signatureName && (
                    <span className="text-sm text-muted-foreground">
                      {t("signedAs", { name: initial.document_processing.signatureName })}
                    </span>
                  )}
                  {changedAt && <span className="text-xs text-muted-foreground">{changedAt}</span>}
                </div>
              </div>
              {a === "document_processing" && needsSignature && (
                <div className="flex flex-col gap-1.5 pl-8">
                  <Label htmlFor="authorization-signature">{t("signatureLabel")}</Label>
                  <Input
                    id="authorization-signature"
                    autoComplete="name"
                    maxLength={200}
                    placeholder={fullName}
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="h-11 text-base"
                  />
                  <span className="text-xs text-muted-foreground">{t("signatureHelp")}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">{t("note")}</p>
      {status.kind === "saved" && (
        <p className="flex items-start gap-2 text-sm text-foreground" role="status">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          {t("saved")}
        </p>
      )}
      {status.kind === "error" && (
        <p className="text-sm text-destructive" role="alert">
          {status.message}
        </p>
      )}
      <Button type="button" size="lg" className="h-12 text-base" disabled={busy || !dirty} onClick={save}>
        {busy ? t("saving") : t("save")}
      </Button>
    </div>
  );
}
