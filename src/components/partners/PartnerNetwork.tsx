"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, CheckCircle2, FileText, UserRound } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { SendReferralForm } from "./PartnerReferrals";
import { PartnerUploadForm } from "./PartnerUploadForm";

type Contact = {
  id: string;
  createdAt: string;
  kind: "person" | "business";
  name: string;
  businessName: string | null;
  phone: string | null;
  email: string | null;
  services: string | null;
  note: string | null;
  documents: { id: string; fileName: string }[];
};

// "My allies and contacts": the ally's OWN network. A person who needs a
// service goes to AMS as a referral (Lead); a business goes to AMS as a
// prospect ally. The ally only ever sees what it typed here.
export function PartnerNetwork({ contacts, services }: { contacts: Contact[]; services: readonly string[] }) {
  const t = useTranslations("Partners.network");
  const [kind, setKind] = useState<"person" | "business" | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="font-heading text-lg text-foreground">{t("addTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("kindQuestion")}</p>
        <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("kindQuestion")}>
          {(
            [
              ["person", UserRound],
              ["business", Building2],
            ] as const
          ).map(([k, Icon]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn(
                "flex min-h-14 items-start gap-3 rounded-lg border-2 p-3 text-left",
                kind === k ? "border-primary bg-accent/40" : "border-border hover:bg-secondary",
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">{t(`kind.${k}`)}</span>
                <span className="text-sm text-muted-foreground">{t(`kindHint.${k}`)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {kind === "person" && <SendReferralForm services={services} endpoint="/api/partners/contacts" title={t("personTitle")} />}
      {kind === "business" && <BusinessForm onDone={() => setKind(null)} />}

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-foreground">{t("listTitle", { count: contacts.length })}</h2>
        {contacts.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {contacts.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    {c.kind === "business" ? <Building2 className="size-4 text-primary" aria-hidden /> : <UserRound className="size-4 text-primary" aria-hidden />}
                    {c.kind === "business" ? c.businessName : c.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {t(`kind.${c.kind}`)} · {formatDate(c.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[c.kind === "business" && c.name !== c.businessName ? c.name : null, c.phone, c.email].filter(Boolean).join(" · ")}
                </p>
                {c.services && <p className="text-sm text-foreground">{t("servicesValue", { services: c.services })}</p>}
                {c.note && <p className="text-sm whitespace-pre-line text-foreground">{c.note}</p>}
                {c.documents.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {c.documents.map((d) => (
                      <li key={d.id}>
                        <a
                          href={`/api/partners/contacts/documents/${d.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-2 text-sm text-primary underline"
                        >
                          <FileText className="size-4" aria-hidden />
                          {d.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <details className="text-sm">
                  <summary className="min-h-10 cursor-pointer py-2 text-primary">{t("addDocument")}</summary>
                  <div className="pt-2">
                    <PartnerUploadForm kind="contact_document" contactId={c.id} label={t("chooseFile")} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BusinessForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("Partners.network");
  const tRef = useTranslations("Partners.referrals");
  const router = useRouter();
  const empty = { businessName: "", name: "", phone: "", email: "", services: "", note: "" };
  const [form, setForm] = useState(empty);
  const [permission, setPermission] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/partners/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: { ...form, kind: "business", permission }, permissionText: tRef("permission") }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        const key = `errors.${data.error}`;
        setMessage({ kind: "error", text: t.has(key) ? t(key) : tRef.has(key) ? tRef(key) : tRef("errors.generic") });
        return;
      }
      setForm(empty);
      setPermission(false);
      setMessage({ kind: "ok", text: t("businessSent") });
      router.refresh();
      onDone();
    } catch {
      setMessage({ kind: "error", text: tRef("errors.generic") });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <h2 className="font-heading text-lg text-foreground">{t("businessTitle")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="b-business">{t("fields.businessName")}</Label>
          <Input id="b-business" value={form.businessName} onChange={set("businessName")} maxLength={200} className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="b-name">{t("fields.name")}</Label>
          <Input id="b-name" value={form.name} onChange={set("name")} maxLength={200} className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="b-phone">{tRef("phone")}</Label>
          <Input id="b-phone" type="tel" value={form.phone} onChange={set("phone")} className="h-11" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="b-email">{tRef("email")}</Label>
          <Input id="b-email" type="email" value={form.email} onChange={set("email")} className="h-11" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="b-services">{t("fields.services")}</Label>
        <Textarea id="b-services" rows={2} maxLength={1000} value={form.services} onChange={set("services")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="b-note">{tRef("note")}</Label>
        <Textarea id="b-note" rows={2} maxLength={1000} value={form.note} onChange={set("note")} />
      </div>
      <label htmlFor="b-permission" className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
        <Checkbox id="b-permission" checked={permission} onCheckedChange={(v) => setPermission(v === true)} className="mt-0.5 size-5" />
        <span>{tRef("permission")}</span>
      </label>
      {message && (
        <p className={message.kind === "ok" ? "flex items-center gap-2 text-sm text-foreground" : "text-sm text-destructive"} role={message.kind === "ok" ? "status" : "alert"}>
          {message.kind === "ok" && <CheckCircle2 className="size-4 text-primary" aria-hidden />}
          {message.text}
        </p>
      )}
      <Button type="submit" size="lg" className="h-12 w-full text-base sm:w-fit" disabled={sending || !permission}>
        {sending ? tRef("sending") : t("addBusiness")}
      </Button>
    </form>
  );
}
