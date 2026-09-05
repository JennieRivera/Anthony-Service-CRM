"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  communicationPreferencesFormSchema,
  whatsappContactStatusValues,
  emailContactStatusValues,
  smsContactStatusValues,
  preferredChannelValues,
  type CommunicationPreferencesFormValues,
} from "@/lib/validation/communicationPreferences";
import { upsertCommunicationPreferencesAction } from "@/app/[locale]/(app)/clients/communication-preferences-actions";
import type { ClientCommunicationPreferences } from "@/lib/db/schema";

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function CommunicationPreferencesPanel({
  clientId,
  preferences,
}: {
  clientId: string;
  preferences: ClientCommunicationPreferences | null;
}) {
  const t = useTranslations("CommunicationPreferences");
  const tChannel = useTranslations("ConversationChannel");
  const tWhatsappStatus = useTranslations("WhatsappContactStatus");
  const tEmailStatus = useTranslations("EmailContactStatus");
  const tSmsStatus = useTranslations("SmsContactStatus");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    control,
  } = useForm<CommunicationPreferencesFormValues>({
    resolver: zodResolver(communicationPreferencesFormSchema),
    defaultValues: {
      preferredChannel: preferences?.preferredChannel ?? "",
      emailConsent: preferences?.emailConsent ?? false,
      smsConsent: preferences?.smsConsent ?? false,
      whatsappConsent: preferences?.whatsappConsent ?? false,
      marketingConsent: preferences?.marketingConsent ?? false,
      partnerReferralConsent: preferences?.partnerReferralConsent ?? false,
      consentDate: preferences?.consentDate ?? "",
      consentSource: preferences?.consentSource ?? "",
      optOutDate: preferences?.optOutDate ?? "",
      whatsappNumber: preferences?.whatsappNumber ?? "",
      whatsappContactStatus: preferences?.whatsappContactStatus ?? "not_connected",
      nextWhatsappFollowUpDate: preferences?.nextWhatsappFollowUpDate ?? "",
      whatsappTemplateUsed: preferences?.whatsappTemplateUsed ?? "",
      emailStatus: preferences?.emailStatus ?? "consent_pending",
      nextEmailFollowUpDate: preferences?.nextEmailFollowUpDate ?? "",
      emailTemplateUsed: preferences?.emailTemplateUsed ?? "",
      smsStatus: preferences?.smsStatus ?? "consent_pending",
      nextSmsFollowUpDate: preferences?.nextSmsFollowUpDate ?? "",
      smsTemplateUsed: preferences?.smsTemplateUsed ?? "",
    },
  });

  function submit(values: CommunicationPreferencesFormValues) {
    startTransition(async () => {
      await upsertCommunicationPreferencesAction(clientId, values);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">{t("whatsappLastMessage")}</p>
          <p className="text-foreground">
            {formatDateTime(preferences?.lastWhatsappMessageAt)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("emailLastSent")}</p>
          <p className="text-foreground">
            {formatDateTime(preferences?.lastEmailSentAt)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("emailLastReceived")}</p>
          <p className="text-foreground">
            {formatDateTime(preferences?.lastEmailReceivedAt)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("smsLastSent")}</p>
          <p className="text-foreground">
            {formatDateTime(preferences?.lastSmsSentAt)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("smsLastReceived")}</p>
          <p className="text-foreground">
            {formatDateTime(preferences?.lastSmsReceivedAt)}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("autoUpdateNote")}</p>

      <form
        onSubmit={handleSubmit(submit)}
        className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6"
      >
        <div className="flex flex-col gap-4 rounded-md border border-border p-4">
          <h3 className="font-heading text-base text-foreground">
            {t("generalConsent")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("preferredChannel")}</Label>
              <Controller
                control={control}
                name="preferredChannel"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("notSet")}</SelectItem>
                      {preferredChannelValues.map((channel) => (
                        <SelectItem key={channel} value={channel}>
                          {tChannel(channel)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="consentDate">{t("consentDate")}</Label>
              <Input id="consentDate" type="date" {...register("consentDate")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="consentSource">{t("consentSource")}</Label>
              <Input
                id="consentSource"
                placeholder={t("consentSourcePlaceholder")}
                {...register("consentSource")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="optOutDate">{t("optOutDate")}</Label>
              <Input id="optOutDate" type="date" {...register("optOutDate")} />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Controller
                control={control}
                name="emailConsent"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              {t("emailConsent")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Controller
                control={control}
                name="smsConsent"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              {t("smsConsent")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Controller
                control={control}
                name="whatsappConsent"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              {t("whatsappConsent")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Controller
                control={control}
                name="marketingConsent"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              {t("marketingConsent")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Controller
                control={control}
                name="partnerReferralConsent"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              {t("partnerReferralConsent")}
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-base text-foreground">
                {t("whatsappSection")}
              </h3>
              {preferences && (
                <Badge variant="outline">
                  {tWhatsappStatus(preferences.whatsappContactStatus)}
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="whatsappNumber">{t("whatsappNumber")}</Label>
              <Input id="whatsappNumber" {...register("whatsappNumber")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("whatsappContactStatus")}</Label>
              <Controller
                control={control}
                name="whatsappContactStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {whatsappContactStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tWhatsappStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nextWhatsappFollowUpDate">
                {t("nextFollowUp")}
              </Label>
              <Input
                id="nextWhatsappFollowUpDate"
                type="date"
                {...register("nextWhatsappFollowUpDate")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="whatsappTemplateUsed">{t("templateUsed")}</Label>
              <Input
                id="whatsappTemplateUsed"
                {...register("whatsappTemplateUsed")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-base text-foreground">
                {t("emailSection")}
              </h3>
              {preferences && (
                <Badge variant="outline">
                  {tEmailStatus(preferences.emailStatus)}
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("emailStatus")}</Label>
              <Controller
                control={control}
                name="emailStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {emailContactStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tEmailStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nextEmailFollowUpDate">
                {t("nextFollowUp")}
              </Label>
              <Input
                id="nextEmailFollowUpDate"
                type="date"
                {...register("nextEmailFollowUpDate")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emailTemplateUsed">{t("templateUsed")}</Label>
              <Input id="emailTemplateUsed" {...register("emailTemplateUsed")} />
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-base text-foreground">
                {t("smsSection")}
              </h3>
              {preferences && (
                <Badge variant="outline">
                  {tSmsStatus(preferences.smsStatus)}
                </Badge>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("smsStatus")}</Label>
              <Controller
                control={control}
                name="smsStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {smsContactStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tSmsStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nextSmsFollowUpDate">{t("nextFollowUp")}</Label>
              <Input
                id="nextSmsFollowUpDate"
                type="date"
                {...register("nextSmsFollowUpDate")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="smsTemplateUsed">{t("templateUsed")}</Label>
              <Input id="smsTemplateUsed" {...register("smsTemplateUsed")} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-sm text-muted-foreground">{t("saved")}</span>
          )}
          <Button type="submit" disabled={isPending}>
            {isPending ? t("saving") : t("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}
