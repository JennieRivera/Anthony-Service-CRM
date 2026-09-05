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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  referralFormSchema,
  referralStatusValues,
  type ReferralFormValues,
} from "@/lib/validation/referral";
import type { Referral } from "@/lib/db/schema";

export function ReferralForm({
  referral,
  clients,
  cases,
  defaultClientId,
  onSubmit,
}: {
  referral?: Referral;
  clients: { id: string; fullName: string }[];
  cases: { id: string; title: string }[];
  defaultClientId?: string;
  onSubmit: (values: ReferralFormValues) => Promise<void>;
}) {
  const t = useTranslations("Referrals.form");
  const tReferrals = useTranslations("Referrals");
  const tStatus = useTranslations("ReferralStatus");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<ReferralFormValues>({
    resolver: zodResolver(referralFormSchema),
    defaultValues: {
      clientId: referral?.clientId ?? defaultClientId ?? "",
      caseId: referral?.caseId ?? "",
      referralDate:
        referral?.referralDate ?? new Date().toISOString().slice(0, 10),
      originatingBusiness: referral?.originatingBusiness ?? "",
      referredBy: referral?.referredBy ?? "",
      receivingParty: referral?.receivingParty ?? "",
      status: referral?.status ?? "submitted",
      closedDate: referral?.closedDate ?? "",
      grossRevenue: referral?.grossRevenue ?? "",
      allowedDeductions: referral?.allowedDeductions ?? "",
      commissionPercentage: referral?.commissionPercentage ?? "",
      commissionPaidDate: referral?.commissionPaidDate ?? "",
      paymentMethod: referral?.paymentMethod ?? "",
      paymentConfirmation: referral?.paymentConfirmation ?? "",
      notes: referral?.notes ?? "",
    },
  });

  const grossRevenue = Number(watch("grossRevenue")) || 0;
  const allowedDeductions = Number(watch("allowedDeductions")) || 0;
  const commissionPercentage = Number(watch("commissionPercentage")) || 0;
  const netServiceRevenue = Math.max(grossRevenue - allowedDeductions, 0);
  const commissionDue = netServiceRevenue * (commissionPercentage / 100);

  async function submit(values: ReferralFormValues) {
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
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
          <Label htmlFor="referralDate">{t("referralDate")}</Label>
          <Input id="referralDate" type="date" {...register("referralDate")} />
          {errors.referralDate && (
            <p className="text-sm text-destructive">
              {errors.referralDate.message}
            </p>
          )}
        </div>

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
                  {referralStatusValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {tStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="originatingBusiness">
            {t("originatingBusiness")}
          </Label>
          <Input
            id="originatingBusiness"
            {...register("originatingBusiness")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="referredBy">{t("referredBy")}</Label>
          <Input id="referredBy" {...register("referredBy")} />
          {errors.referredBy && (
            <p className="text-sm text-destructive">
              {errors.referredBy.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receivingParty">{t("receivingParty")}</Label>
          <Input id="receivingParty" {...register("receivingParty")} />
          {errors.receivingParty && (
            <p className="text-sm text-destructive">
              {errors.receivingParty.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="closedDate">{t("closedDate")}</Label>
          <Input id="closedDate" type="date" {...register("closedDate")} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="grossRevenue">{t("grossRevenue")}</Label>
            <Input
              id="grossRevenue"
              type="number"
              step="0.01"
              {...register("grossRevenue")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="allowedDeductions">{t("allowedDeductions")}</Label>
            <Input
              id="allowedDeductions"
              type="number"
              step="0.01"
              {...register("allowedDeductions")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="commissionPercentage">
              {t("commissionPercentage")}
            </Label>
            <Input
              id="commissionPercentage"
              type="number"
              step="0.01"
              {...register("commissionPercentage")}
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-8 text-sm">
          <div className="flex flex-col items-end">
            <span className="text-muted-foreground">
              {tReferrals("netServiceRevenue")}
            </span>
            <span className="text-foreground">
              ${netServiceRevenue.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-muted-foreground">
              {tReferrals("commissionDue")}
            </span>
            <span className="text-lg font-medium text-foreground">
              ${commissionDue.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="commissionPaidDate">
            {t("commissionPaidDate")}
          </Label>
          <Input
            id="commissionPaidDate"
            type="date"
            {...register("commissionPaidDate")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paymentMethod">{t("paymentMethod")}</Label>
          <Input id="paymentMethod" {...register("paymentMethod")} />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="paymentConfirmation">
            {t("paymentConfirmation")}
          </Label>
          <Input
            id="paymentConfirmation"
            {...register("paymentConfirmation")}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

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
