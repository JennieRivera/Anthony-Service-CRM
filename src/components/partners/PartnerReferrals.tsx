"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Lock } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/dates";

type Stage = "new" | "contacted" | "closed" | "not_closed";
type SentStage = "sent" | "assigned" | Stage;
type ToPartner = {
  id: string;
  referralSeq: number;
  referralDate: string;
  stage: Stage;
  shared: boolean;
  name: string | null;
  phone: string | null;
  partnerNote: string | null;
  partnerService: string | null;
  // Another ally's referral that AMS assigned to this ally: what's needed.
  requestedService: string | null;
};
type FromPartner = {
  id: string;
  referralSeq: number;
  referralDate: string;
  stage: SentStage;
  name: string | null;
  phone: string | null;
  email: string | null;
  service: string | null;
  note: string | null;
  networkRouting: boolean;
  directReferral: boolean;
  requestedService: string | null;
  // Shown only when AMS chose to show who received it.
  assignedTo: string | null;
};

const seq = (n: number) => `R-${String(n).padStart(3, "0")}`;

export function PartnerReferrals({
  toPartner,
  fromPartner,
  services,
}: {
  toPartner: ToPartner[];
  fromPartner: FromPartner[];
  services: readonly string[];
}) {
  const t = useTranslations("Partners.referrals");
  const tService = useTranslations("PublicServiceType");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function setStage(id: string, stage: string) {
    setBusy(id);
    await fetch(`/api/partners/referrals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    }).catch(() => undefined);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-foreground">{t("toYouTitle")}</h2>
        {toPartner.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">{t("toYouEmpty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {toPartner.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">
                    {seq(r.referralSeq)} · {formatDate(r.referralDate)}
                  </span>
                  <Badge variant="outline">{t(`stage.${r.stage}`)}</Badge>
                </div>
                {r.shared ? (
                  <p className="text-sm text-foreground">
                    {r.name}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Lock className="size-4" aria-hidden />
                    {t("hidden")}
                  </p>
                )}
                {r.partnerService && <p className="text-sm text-muted-foreground">{tService(r.partnerService)}</p>}
                {r.requestedService && <p className="text-sm text-muted-foreground">{t("needs", { service: r.requestedService })}</p>}
                {r.partnerNote && <p className="text-sm whitespace-pre-line text-foreground">{r.partnerNote}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  <Label htmlFor={`stage-${r.id}`} className="text-sm">
                    {t("updateStage")}
                  </Label>
                  <select
                    id={`stage-${r.id}`}
                    value={r.stage === "new" ? "" : r.stage}
                    disabled={busy === r.id}
                    onChange={(e) => e.target.value && setStage(r.id, e.target.value)}
                    className="h-10 rounded-lg border border-input bg-card px-2 text-sm text-foreground"
                  >
                    <option value="" disabled>
                      {t("stage.new")}
                    </option>
                    {(["contacted", "closed", "not_closed"] as const).map((s) => (
                      <option key={s} value={s}>
                        {t(`stage.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SendReferralForm services={services} />

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-foreground">{t("fromYouTitle")}</h2>
        {fromPartner.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">{t("fromYouEmpty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
            {fromPartner.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span className="flex flex-col gap-0.5">
                  <span className="text-foreground">
                    {seq(r.referralSeq)} · {r.name}
                    {r.service ? ` · ${tService(r.service)}` : ""}
                  </span>
                  {r.directReferral ? (
                    <span className="text-muted-foreground">{t("directTo", { name: r.assignedTo ?? "", service: r.requestedService ?? "" })}</span>
                  ) : (
                    r.networkRouting && (
                      <span className="text-muted-foreground">
                        {t("toAnotherAlly", { service: r.requestedService ?? "" })}
                        {r.assignedTo ? ` · ${t("assignedTo", { name: r.assignedTo })}` : ""}
                      </span>
                    )
                  )}
                </span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  <Badge variant="outline">{t(`stage.${r.stage}`)}</Badge>
                  {formatDate(r.referralDate)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// "Send us a referral" — also used for a person in "My allies and
// contacts". Option A: "send it to another ally of the AMS network" (the
// ally writes the service the person needs; AMS picks the ally).
export function SendReferralForm({
  services,
  endpoint = "/api/partners/referrals",
  title,
  directTo,
}: {
  services: readonly string[];
  endpoint?: string;
  title?: string;
  // Option B (network directory): straight to this ally.
  directTo?: { id: string; name: string };
}) {
  const t = useTranslations("Partners.referrals");
  const tService = useTranslations("PublicServiceType");
  const router = useRouter();
  const empty = { name: "", phone: "", email: "", service: "", note: "", requestedService: "" };
  const [form, setForm] = useState(empty);
  const [permission, setPermission] = useState(false);
  const [network, setNetwork] = useState(false);
  const permissionText = directTo ? t("permissionDirect", { name: directTo.name }) : t("permission");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referral: { ...form, kind: "person", permission, network: !directTo && network, directTo: directTo?.id },
          permissionText: permissionText,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ kind: "error", text: t.has(`errors.${data.error}`) ? t(`errors.${data.error}`) : t("errors.generic") });
        return;
      }
      setForm(empty);
      setPermission(false);
      setNetwork(false);
      setMessage({ kind: "ok", text: t("sent") });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: t("errors.generic") });
    } finally {
      setSending(false);
    }
  }

  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={send} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-heading text-lg text-foreground">{title ?? t("sendTitle")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-name">{t("name")}</Label>
          <Input id="r-name" value={form.name} onChange={set("name")} className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-phone">{t("phone")}</Label>
          <Input id="r-phone" type="tel" value={form.phone} onChange={set("phone")} className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-email">{t("email")}</Label>
          <Input id="r-email" type="email" value={form.email} onChange={set("email")} className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-service">{t("service")}</Label>
          <select id="r-service" value={form.service} onChange={set("service")} className="h-11 rounded-lg border border-input bg-card px-3 text-base text-foreground">
            <option value="">{t("serviceNone")}</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {tService(s)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="r-note">{t("note")}</Label>
        <Textarea id="r-note" rows={3} maxLength={1000} value={form.note} onChange={set("note")} />
      </div>
      {directTo ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="r-requested">{t("requestedService")}</Label>
          <Input id="r-requested" value={form.requestedService} onChange={set("requestedService")} maxLength={200} placeholder={t("requestedServicePlaceholder")} className="h-11" />
        </div>
      ) : (
      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <label htmlFor="r-network" className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
          <Checkbox id="r-network" checked={network} onCheckedChange={(v) => setNetwork(v === true)} className="mt-0.5 size-5" />
          <span className="flex flex-col gap-0.5">
            <span>{t("network")}</span>
            <span className="text-muted-foreground">{t("networkHint")}</span>
          </span>
        </label>
        {network && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="r-requested">{t("requestedService")}</Label>
            <Input id="r-requested" value={form.requestedService} onChange={set("requestedService")} maxLength={200} placeholder={t("requestedServicePlaceholder")} className="h-11" />
          </div>
        )}
      </div>
      )}
      <label htmlFor="r-permission" className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
        <Checkbox id="r-permission" checked={permission} onCheckedChange={(v) => setPermission(v === true)} className="mt-0.5 size-5" />
        <span>{permissionText}</span>
      </label>
      {message && (
        <p className={message.kind === "ok" ? "flex items-center gap-2 text-sm text-foreground" : "text-sm text-destructive"} role={message.kind === "ok" ? "status" : "alert"}>
          {message.kind === "ok" && <CheckCircle2 className="size-4 text-primary" aria-hidden />}
          {message.text}
        </p>
      )}
      <Button type="submit" size="lg" className="h-12 w-full text-base sm:w-fit" disabled={sending || !permission}>
        {sending ? t("sending") : t("send")}
      </Button>
    </form>
  );
}
