"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  communicationFormSchema,
  communicationChannelValues,
  communicationDirectionValues,
  communicationStatusValues,
  type CommunicationFormValues,
} from "@/lib/validation/communication";
import type { ConversationMessage, MessageTemplate } from "@/lib/db/schema";

function nowForInput() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function toInputDateTime(value: Date | string) {
  const d = new Date(value);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function CommunicationForm({
  communication,
  clients,
  cases,
  referrals,
  defaultClientId,
  defaultCaseId,
  template,
  onSubmit,
}: {
  communication?: ConversationMessage;
  clients: { id: string; fullName: string }[];
  cases: { id: string; title: string }[];
  referrals: { id: string; referralSeq: number }[];
  defaultClientId?: string;
  defaultCaseId?: string;
  template?: MessageTemplate | null;
  onSubmit: (values: CommunicationFormValues) => Promise<void>;
}) {
  const t = useTranslations("Communications.form");
  const tChannel = useTranslations("ConversationChannel");
  const tDirection = useTranslations("ConversationDirection");
  const tStatus = useTranslations("CommunicationStatus");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CommunicationFormValues>({
    resolver: zodResolver(communicationFormSchema),
    defaultValues: {
      clientId: communication?.clientId ?? defaultClientId ?? "",
      caseId: communication?.caseId ?? defaultCaseId ?? "",
      referralId: communication?.referralId ?? "",
      businessName: communication?.businessName ?? "",
      channel: communication?.channel ?? template?.channel ?? "email",
      direction: communication?.direction ?? "outbound",
      occurredAt: communication
        ? toInputDateTime(communication.occurredAt)
        : nowForInput(),
      subject: communication?.subject ?? template?.subject ?? "",
      summary: communication?.summary ?? (template ? template.name : ""),
      fullMessage: communication?.fullMessage ?? template?.messageBody ?? "",
      durationMinutes: communication?.durationMinutes?.toString() ?? "",
      counterpart: communication?.counterpart ?? "",
      status: communication?.status ?? "new",
      followUpRequired: communication?.followUpRequired ?? false,
      followUpDate: communication?.followUpDate ?? "",
    },
  });

  const channel = watch("channel");
  const followUpRequired = watch("followUpRequired");

  async function submit(values: CommunicationFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      // Next.js redirect() (used on success) throws internally with this
      // digest — let it propagate instead of treating it as a form error.
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        typeof (err as { digest?: unknown }).digest === "string" &&
        (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("client")}</Label>
          <Controller
            control={control}
            name="clientId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectClient")} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.clientId && (
            <p className="text-sm text-destructive">
              {errors.clientId.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="businessName">{t("businessName")}</Label>
          <Input id="businessName" {...register("businessName")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("case")}</Label>
          <Controller
            control={control}
            name="caseId"
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
                  <SelectItem value="none">{t("noCase")}</SelectItem>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("referral")}</Label>
          <Controller
            control={control}
            name="referralId"
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
                  <SelectItem value="none">{t("noReferral")}</SelectItem>
                  {referrals.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      REF-{String(r.referralSeq).padStart(5, "0")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("channel")}</Label>
          <Controller
            control={control}
            name="channel"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {communicationChannelValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tChannel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("direction")}</Label>
          <Controller
            control={control}
            name="direction"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {communicationDirectionValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tDirection(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="occurredAt">{t("occurredAt")}</Label>
          <Input
            id="occurredAt"
            type="datetime-local"
            {...register("occurredAt")}
          />
          {errors.occurredAt && (
            <p className="text-sm text-destructive">
              {errors.occurredAt.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="counterpart">{t("counterpart")}</Label>
          <Input id="counterpart" {...register("counterpart")} />
        </div>

        {channel === "email" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject">{t("subject")}</Label>
            <Input id="subject" {...register("subject")} />
          </div>
        )}

        {channel === "call" && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="durationMinutes">{t("durationMinutes")}</Label>
            <Input
              id="durationMinutes"
              type="number"
              min="0"
              {...register("durationMinutes")}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label>{t("status")}</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {communicationStatusValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tStatus(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="summary">{t("summary")}</Label>
        <Textarea
          id="summary"
          rows={2}
          placeholder={t("summaryPlaceholder")}
          {...register("summary")}
        />
        {errors.summary && (
          <p className="text-sm text-destructive">{errors.summary.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fullMessage">{t("fullMessage")}</Label>
        <Textarea
          id="fullMessage"
          rows={5}
          placeholder={t("fullMessagePlaceholder")}
          {...register("fullMessage")}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="followUpRequired"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label>{t("followUpRequired")}</Label>
        </div>
        {followUpRequired && (
          <div className="flex flex-col gap-1.5 sm:w-64">
            <Label htmlFor="followUpDate">{t("followUpDate")}</Label>
            <Input
              id="followUpDate"
              type="date"
              {...register("followUpDate")}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
