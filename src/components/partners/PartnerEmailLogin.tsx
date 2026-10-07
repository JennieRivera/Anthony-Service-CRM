"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// "Sign in with my email" (Diamante Conecta 360): email → 6-digit code →
// session. The first answer is always the same, so it never tells whether
// an email is registered.
export function PartnerEmailLogin() {
  const t = useTranslations("Partners.emailLogin");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorText = (e?: string) => (e && t.has(`errors.${e}`) ? t(`errors.${e}`) : t("errors.generic"));

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("errors.email"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/partners/email-login/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(errorText(data.error));
        return;
      }
      setStep("code");
    } catch {
      setError(errorText());
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/partners/email-login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(errorText(data.error));
        return;
      }
      router.replace("/partners");
      router.refresh();
    } catch {
      setError(errorText());
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="lg" className="h-12 w-full text-base" onClick={() => setOpen(true)}>
        <Mail className="size-5" aria-hidden />
        {t("open")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
      {step === "email" ? (
        <form onSubmit={requestCode} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t("intro")}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-email">{t("email")}</Label>
            <Input id="login-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" />
          </div>
          <Button type="submit" size="lg" className="h-12 text-base" disabled={busy}>
            {busy ? t("sending") : t("sendCode")}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t("codeSent", { email })}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="login-code">{t("code")}</Label>
            <Input
              id="login-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="h-12 text-center text-xl tracking-[0.4em]"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 text-base" disabled={busy || code.length !== 6}>
            {busy ? t("checking") : t("signIn")}
          </Button>
          <button type="button" className="min-h-11 text-sm text-primary underline" onClick={() => { setStep("email"); setCode(""); setError(null); }}>
            {t("changeEmail")}
          </button>
        </form>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
