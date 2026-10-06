"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/dates";
import {
  CLIENT_NOTICE_TYPES,
  NOTICE_TYPES,
  OWNER_NOTICE_TYPES,
  type NoticeType,
  type NotificationSettings,
} from "@/lib/notifications/config";
import { DEFAULT_NOTICE_TEXTS, channelsFor, type NoticeTextKey } from "@/lib/notifications/texts";
import {
  notificationSettingsFormSchema,
  type NotificationSettingsFormValues,
} from "@/lib/validation/notifications";
import {
  resetNotificationTextAction,
  saveNotificationSettingsAction,
  saveNotificationTextAction,
  sendTestNoticeAction,
} from "@/app/[locale]/(app)/settings/notifications/actions";
import type { SmsSetupStatus } from "@/lib/notifications/providers";

type SavedText = { type: string; channel: string; language: string; subject: string; body: string };
type RecentRow = {
  id: string;
  createdAt: string;
  sentAt: string | null;
  type: string;
  channel: string;
  recipient: string | null;
  status: string;
  error: string | null;
  testMode: boolean;
};

export function NotificationSettingsManager({
  settings,
  savedTexts,
  recent,
  providers,
}: {
  settings: NotificationSettings;
  savedTexts: SavedText[];
  recent: RecentRow[];
  providers: { email: boolean; sms: boolean; smsStatus: SmsSetupStatus; fromEmail: string; webhookUrl: string };
}) {
  const t = useTranslations("Notices");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const { register, control, handleSubmit, formState } = useForm<NotificationSettingsFormValues>({
    resolver: zodResolver(notificationSettingsFormSchema),
    defaultValues: settings,
  });

  function save(values: NotificationSettingsFormValues) {
    setMessage(null);
    startTransition(async () => {
      try {
        await saveNotificationSettingsAction(values);
        setMessage({ kind: "ok", text: t("saved") });
      } catch {
        setMessage({ kind: "error", text: t("error") });
      }
    });
  }

  function test(channel: "sms" | "email") {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestNoticeAction(channel, "es");
      setMessage(
        result.ok
          ? { kind: "ok", text: t(channel === "sms" ? "testSmsSent" : "testEmailSent") }
          : {
              kind: "error",
              // Known reasons get a plain sentence; anything else (a
              // provider error) is shown as-is.
              text: t.has(`testErrors.${result.error}`)
                ? t(`testErrors.${result.error}`)
                : t("testFailed", { error: result.error }),
            },
      );
    });
  }

  const switchRow = (name: "enabled" | "testMode" | "preciseReminders", label: string, help?: string) => (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <Label htmlFor={`notices-${name}`}>{label}</Label>
        {help && <p className="text-xs text-muted-foreground">{help}</p>}
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch id={`notices-${name}`} checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
        )}
      />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("providersTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <Mail className="h-4 w-4" aria-hidden />
            {t("emailProvider")}:
            <strong className={providers.email ? "text-foreground" : "text-destructive"}>
              {providers.email ? t("connected") : t("notConnected")}
            </strong>
            <span className="text-muted-foreground">({providers.fromEmail})</span>
          </p>
          <p className="flex flex-wrap items-center gap-2">
            <MessageSquare className="h-4 w-4" aria-hidden />
            {t("smsProvider")}:
            <strong className={providers.sms ? "text-foreground" : "text-destructive"}>
              {providers.sms ? t("connected") : t("notConnected")}
            </strong>
            {!providers.sms && <span className="text-muted-foreground">— {t(`smsStatus.${providers.smsStatus}`)}</span>}
          </p>
          <p className="text-muted-foreground">
            {t("webhookHelp")} <code className="break-all text-foreground">{providers.webhookUrl}</code>
          </p>
          <p className="text-muted-foreground">{t("providersHelp")}</p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(save)} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("generalTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {switchRow("enabled", t("enabled"), t("enabledHelp"))}
            {switchRow("testMode", t("testMode"), t("testModeHelp"))}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notices-test-phone">{t("testPhone")}</Label>
                <Input id="notices-test-phone" type="tel" {...register("testPhone")} />
                {formState.errors.testPhone && <p className="text-xs text-destructive">{t("invalidPhone")}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="notices-test-email">{t("testEmail")}</Label>
                <Input id="notices-test-email" type="email" {...register("testEmail")} />
                {formState.errors.testEmail && <p className="text-xs text-destructive">{t("invalidEmail")}</p>}
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="notices-owner-email">{t("ownerAlertEmail")}</Label>
                <Input id="notices-owner-email" type="email" placeholder={t("ownerAlertEmailPlaceholder")} {...register("ownerAlertEmail")} />
                {formState.errors.ownerAlertEmail && <p className="text-xs text-destructive">{t("invalidEmail")}</p>}
              </div>
            </div>
            {switchRow("preciseReminders", t("preciseReminders"), t("preciseRemindersHelp"))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("typesTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {[...CLIENT_NOTICE_TYPES, ...OWNER_NOTICE_TYPES].map((type) => (
              <div key={type} className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor={`notices-type-${type}`}>{t(`types.${type}.title`)}</Label>
                  <p className="text-xs text-muted-foreground">{t(`types.${type}.help`)}</p>
                </div>
                <Controller
                  control={control}
                  name={`types.${type}`}
                  render={({ field }) => (
                    <Switch id={`notices-type-${type}`} checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                  )}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {message && (
            <p className={message.kind === "ok" ? "text-sm text-muted-foreground" : "text-sm text-destructive"} role="status">
              {message.text}
            </p>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{t("testTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{t("testHelp")}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => test("sms")}>
              <Send className="h-4 w-4" />
              {t("testSms")}
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => test("email")}>
              <Send className="h-4 w-4" />
              {t("testEmailButton")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <NoticeTextsEditor savedTexts={savedTexts} />

      <Card>
        <CardHeader>
          <CardTitle>{t("logTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("logEmpty")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {recent.map((r) => (
                <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                  <span className="text-muted-foreground">{formatDateTime(r.sentAt ?? r.createdAt)}</span>
                  <span className="text-foreground">{t(`types.${r.type as NoticeType}.title`)}</span>
                  <span className="text-muted-foreground">
                    {t(`channels.${r.channel as "sms" | "email" | "none"}`)}
                    {r.recipient ? ` · ${r.recipient}` : ""}
                  </span>
                  <span className={r.status === "failed" ? "text-destructive" : "text-foreground"}>
                    {t(`statuses.${r.status as "sent"}`)}
                    {r.testMode ? ` · ${t("testModeTag")}` : ""}
                  </span>
                  {r.error && <span className="w-full text-xs text-muted-foreground wrap-anywhere">{r.error}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Edit the wording of each notice, per channel and language.
function NoticeTextsEditor({ savedTexts }: { savedTexts: SavedText[] }) {
  const t = useTranslations("Notices");
  const [type, setType] = useState<NoticeType>("appointment_confirmed");
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const current = (channel: "sms" | "email") => {
    const saved = savedTexts.find((s) => s.type === type && s.channel === channel && s.language === language);
    const fallback = DEFAULT_NOTICE_TEXTS[`${type}:${channel}:${language}` as NoticeTextKey];
    return { subject: saved?.subject ?? fallback?.subject ?? "", body: saved?.body ?? fallback?.body ?? "", saved: Boolean(saved) };
  };
  const [drafts, setDrafts] = useState<Record<string, { subject: string; body: string }>>({});
  const keyOf = (channel: string) => `${type}:${channel}:${language}`;
  const draft = (channel: "sms" | "email") => drafts[keyOf(channel)] ?? current(channel);

  function save(channel: "sms" | "email") {
    const d = draft(channel);
    setMessage(null);
    startTransition(async () => {
      try {
        await saveNotificationTextAction({ type, channel, language, subject: d.subject, body: d.body });
        setMessage({ kind: "ok", text: t("saved") });
      } catch {
        setMessage({ kind: "error", text: t("textError") });
      }
    });
  }

  function reset(channel: "sms" | "email") {
    setMessage(null);
    startTransition(async () => {
      await resetNotificationTextAction({ type, channel, language });
      setDrafts((all) => {
        const next = { ...all };
        delete next[keyOf(channel)];
        return next;
      });
      setMessage({ kind: "ok", text: t("restored") });
    });
  }

  const selectClass = "h-9 rounded-lg border border-input bg-card px-3 text-sm text-foreground";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("textsTitle")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("textsHelp")}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <select aria-label={t("textsType")} className={selectClass} value={type} onChange={(e) => setType(e.target.value as NoticeType)}>
            {NOTICE_TYPES.map((nt) => (
              <option key={nt} value={nt}>
                {t(`types.${nt}.title`)}
              </option>
            ))}
          </select>
          <select aria-label={t("textsLanguage")} className={selectClass} value={language} onChange={(e) => setLanguage(e.target.value as "es" | "en")}>
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>

        {channelsFor(type).map((channel) => {
          const d = draft(channel);
          const update = (patch: Partial<{ subject: string; body: string }>) =>
            setDrafts((all) => ({ ...all, [keyOf(channel)]: { ...d, ...patch } }));
          return (
            <div key={channel} className="flex flex-col gap-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">{t(`channels.${channel}`)}</p>
              {channel === "email" && (
                <Input aria-label={t("subject")} value={d.subject} maxLength={200} onChange={(e) => update({ subject: e.target.value })} />
              )}
              <Textarea
                aria-label={t("body")}
                rows={channel === "sms" ? 3 : 6}
                maxLength={2000}
                value={d.body}
                onChange={(e) => update({ body: e.target.value })}
              />
              {channel === "sms" && <p className="text-xs text-muted-foreground">{t("smsAutoParts")}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" disabled={isPending} onClick={() => save(channel)}>
                  {t("saveText")}
                </Button>
                {current(channel).saved && (
                  <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => reset(channel)}>
                    {t("restoreDefault")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {message && (
          <p className={message.kind === "ok" ? "text-sm text-muted-foreground" : "text-sm text-destructive"} role="status">
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
