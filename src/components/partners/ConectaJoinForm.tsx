"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ALLY_TYPES = [
  "chef_culinary",
  "contractor_remodeling",
  "installer_remodeling",
  "financial_partner",
  "insurance",
  "realtor",
  "cpa_accountant",
  "consultant",
  "other",
] as const;

// "Join Diamante Conecta 360": the form → a 6-digit code to the email →
// done ("we'll review it"). The exact texts accepted are sent along and
// saved as evidence with the date and IP.
export function ConectaJoinForm({ terms, notice, noticeLabel }: { terms: string; notice: string; noticeLabel: string }) {
  const t = useTranslations("Conecta.join");
  const tType = useTranslations("OrganizationType");
  const locale = useLocale();
  const empty = { businessName: "", contactPerson: "", allyType: "", services: "", city: "", phone: "", email: "", website: "", company: "" };
  const [form, setForm] = useState(empty);
  const [accepts, setAccepts] = useState({ terms: false, notice: false, contact: false });
  const [step, setStep] = useState<"form" | "code" | "done">("form");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof empty) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const errorText = (e?: string) => (e && t.has(`errors.${e}`) ? t(`errors.${e}`) : t("errors.generic"));

  async function post(url: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(errorText(data.error));
        return false;
      }
      return true;
    } catch {
      setError(errorText());
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await post("/api/conecta/apply", {
      application: {
        ...form,
        locale,
        acceptTerms: accepts.terms,
        acceptNotice: accepts.notice,
        acceptContact: accepts.contact,
        termsText: terms,
        noticeText: `${notice}\n${noticeLabel}`,
        permissionText: t("acceptContact"),
      },
    });
    if (ok) setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (await post("/api/conecta/verify", { email: form.email, code })) setStep("done");
  }

  if (step === "done") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6" role="status">
        <p className="flex items-center gap-2 font-heading text-lg text-foreground">
          <CheckCircle2 className="size-5 text-primary" aria-hidden />
          {t("doneTitle")}
        </p>
        <p className="text-muted-foreground">{t("doneText")}</p>
      </div>
    );
  }

  if (step === "code") {
    return (
      <form onSubmit={verify} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg text-foreground">{t("codeTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("codeSent", { email: form.email })}</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="j-code">{t("code")}</Label>
          <Input
            id="j-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="h-12 text-center text-xl tracking-[0.4em]"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 text-base" disabled={busy || code.length !== 6}>
          {busy ? t("checking") : t("confirm")}
        </Button>
        <button type="button" className="min-h-11 text-sm text-primary underline" onClick={() => { setStep("form"); setCode(""); setError(null); }}>
          {t("back")}
        </button>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </form>
    );
  }

  const field = (k: keyof typeof empty, type = "text", autoComplete?: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`j-${k}`}>{t(`fields.${k}`)}</Label>
      <Input id={`j-${k}`} type={type} autoComplete={autoComplete} value={form[k]} onChange={set(k)} className="h-12 text-base" />
    </div>
  );
  const check = (k: keyof typeof accepts, label: string) => (
    <label htmlFor={`j-accept-${k}`} className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
      <Checkbox id={`j-accept-${k}`} checked={accepts[k]} onCheckedChange={(v) => setAccepts((a) => ({ ...a, [k]: v === true }))} className="mt-0.5 size-5" />
      <span>{label}</span>
    </label>
  );

  return (
    <form onSubmit={submit} className="relative flex flex-col gap-5 rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("businessName", "text", "organization")}
        {field("contactPerson", "text", "name")}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="j-allyType">{t("fields.allyType")}</Label>
          <select id="j-allyType" value={form.allyType} onChange={set("allyType")} className="h-12 rounded-lg border border-input bg-card px-3 text-base text-foreground">
            <option value="">{t("chooseType")}</option>
            {ALLY_TYPES.map((x) => (
              <option key={x} value={x}>
                {tType(x)}
              </option>
            ))}
          </select>
        </div>
        {field("city", "text", "address-level2")}
        {field("phone", "tel", "tel")}
        {field("email", "email", "email")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="j-services">{t("fields.services")}</Label>
        <Textarea id="j-services" rows={3} maxLength={1000} value={form.services} onChange={set("services")} />
      </div>
      {field("website", "text", "url")}
      {/* Trap field: hidden from people, filled only by bots. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label htmlFor="j-company">Company</label>
        <input id="j-company" tabIndex={-1} autoComplete="off" value={form.company} onChange={set("company")} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">{t("termsTitle")}</p>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-3 text-sm whitespace-pre-line text-foreground">{terms}</div>
      </div>
      <p className="rounded-lg border-2 border-primary/50 p-3 text-sm text-foreground">{notice}</p>
      <div className="flex flex-col gap-3">
        {check("terms", t("acceptTerms"))}
        {check("notice", noticeLabel)}
        {check("contact", t("acceptContact"))}
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <Button type="submit" size="lg" className="h-12 w-full text-base sm:w-fit" disabled={busy || !accepts.terms || !accepts.notice || !accepts.contact}>
        {busy ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
