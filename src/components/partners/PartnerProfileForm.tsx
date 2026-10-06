"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Values = Record<
  | "contactPerson"
  | "phone"
  | "email"
  | "website"
  | "city"
  | "state"
  | "description"
  | "servicesOffered"
  | "serviceArea"
  | "socialLinks"
  | "licenseNumber"
  | "licenseExpiration"
  | "insuranceProvider"
  | "insuranceExpiration",
  string
>;

// "My profile". Saving applies the changes and sends AMS a review task.
// A contractor confirms its Florida license and insurance when it saves
// them (stored with date and IP).
export function PartnerProfileForm({ initial, isContractor }: { initial: Values; isContractor: boolean }) {
  const t = useTranslations("Partners.profile");
  const router = useRouter();
  const [values, setValues] = useState<Values>(initial);
  const [licenseConfirmed, setLicenseConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const hasLicense = [values.licenseNumber, values.licenseExpiration, values.insuranceProvider, values.insuranceExpiration].some((x) => x.trim());

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (isContractor && hasLicense && !licenseConfirmed) {
      setMessage({ kind: "error", text: t("errors.license_confirmation") });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/partners/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values, licenseConfirmed, licenseConfirmText: t("licenseConfirm") }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; changed?: string[] };
      if (!res.ok) {
        setMessage({ kind: "error", text: t.has(`errors.${data.error}`) ? t(`errors.${data.error}`) : t("errors.generic") });
        return;
      }
      setMessage({ kind: "ok", text: data.changed?.length ? t("saved") : t("noChanges") });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: t("errors.generic") });
    } finally {
      setSaving(false);
    }
  }

  const field = (k: keyof Values, type = "text") => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`p-${k}`}>{t(`fields.${k}`)}</Label>
      <Input id={`p-${k}`} type={type} value={values[k]} onChange={set(k)} className="h-11" />
    </div>
  );
  const area = (k: keyof Values) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`p-${k}`}>{t(`fields.${k}`)}</Label>
      <Textarea id={`p-${k}`} rows={3} value={values[k]} onChange={set(k)} />
    </div>
  );

  return (
    <form onSubmit={save} className="flex flex-col gap-5 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("contactPerson")}
        {field("phone", "tel")}
        {field("email", "email")}
        {field("website")}
        {field("city")}
        {field("state")}
      </div>
      {area("description")}
      {area("servicesOffered")}
      {area("serviceArea")}
      {area("socialLinks")}

      <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-medium text-foreground">{t("licenseTitle")}</legend>
        <p className="text-sm text-muted-foreground">{isContractor ? t("licenseHintContractor") : t("licenseHint")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("licenseNumber")}
          {field("licenseExpiration", "date")}
          {field("insuranceProvider")}
          {field("insuranceExpiration", "date")}
        </div>
        {isContractor && hasLicense && (
          <label htmlFor="license-confirm" className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
            <Checkbox id="license-confirm" checked={licenseConfirmed} onCheckedChange={(v) => setLicenseConfirmed(v === true)} className="mt-0.5 size-5" />
            <span>{t("licenseConfirm")}</span>
          </label>
        )}
      </fieldset>

      {message && (
        <p className={message.kind === "ok" ? "flex items-center gap-2 text-sm text-foreground" : "text-sm text-destructive"} role={message.kind === "ok" ? "status" : "alert"}>
          {message.kind === "ok" && <CheckCircle2 className="size-4 text-primary" aria-hidden />}
          {message.text}
        </p>
      )}
      <Button type="submit" size="lg" className="h-12 w-full text-base sm:w-fit" disabled={saving}>
        {saving ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
