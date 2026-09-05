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
  referralFormSchema,
  referralStatusValues,
  referralCategoryValues,
  rriStatusValues,
  type ReferralFormValues,
} from "@/lib/validation/referral";
import type { Referral, RriReferralDetails } from "@/lib/db/schema";

export function ReferralForm({
  referral,
  rriDetails,
  clients,
  cases,
  defaultClientId,
  onSubmit,
}: {
  referral?: Referral;
  rriDetails?: RriReferralDetails | null;
  clients: { id: string; fullName: string }[];
  cases: { id: string; title: string }[];
  defaultClientId?: string;
  onSubmit: (values: ReferralFormValues) => Promise<void>;
}) {
  const t = useTranslations("Referrals.form");
  const tReferrals = useTranslations("Referrals");
  const tStatus = useTranslations("ReferralStatus");
  const tCategory = useTranslations("ReferralCategory");
  const tRriStatus = useTranslations("RriStatus");
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
      category: referral?.category ?? "general",
      originatingBusiness: referral?.originatingBusiness ?? "",
      referredBy: referral?.referredBy ?? "",
      receivingParty: referral?.receivingParty ?? "",
      status: referral?.status ?? "submitted",
      closedDate: referral?.closedDate ?? "",
      grossRevenue: referral?.grossRevenue ?? "",
      allowedDeductions: referral?.allowedDeductions ?? "",
      commissionPercentage: referral?.commissionPercentage ?? "",
      commissionDueDate: referral?.commissionDueDate ?? "",
      commissionPaidDate: referral?.commissionPaidDate ?? "",
      paymentMethod: referral?.paymentMethod ?? "",
      paymentConfirmation: referral?.paymentConfirmation ?? "",
      notes: referral?.notes ?? "",
      rriBusinessName: rriDetails?.businessName ?? "",
      businessEntity: rriDetails?.businessEntity ?? "",
      industry: rriDetails?.industry ?? "",
      yearsInBusiness: rriDetails?.yearsInBusiness?.toString() ?? "",
      fundingPurpose: rriDetails?.fundingPurpose ?? "",
      amountRequested: rriDetails?.amountRequested ?? "",
      monthlyRevenueRange: rriDetails?.monthlyRevenueRange ?? "",
      financingType: rriDetails?.financingType ?? "",
      rriDocumentsRequested: rriDetails?.documentsRequested ?? "",
      rriDocumentsReceived: rriDetails?.documentsReceived ?? "",
      consentToShareInformation: rriDetails?.consentToShareInformation ?? false,
      rriStatus: rriDetails?.status ?? "new_referral",
    },
  });

  const category = watch("category");
  const isCommercialFinance = category === "commercial_finance";

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
          <Label>{t("category")}</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {referralCategoryValues.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {tCategory(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {!isCommercialFinance && (
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
        )}

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
          <Label htmlFor="commissionDueDate">{t("commissionDueDate")}</Label>
          <Input
            id="commissionDueDate"
            type="date"
            {...register("commissionDueDate")}
          />
        </div>

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

      {isCommercialFinance && (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
          <h3 className="font-heading text-base text-foreground">
            {tReferrals("rriDetails")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rriBusinessName">{t("rriBusinessName")}</Label>
              <Input id="rriBusinessName" {...register("rriBusinessName")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessEntity">{t("businessEntity")}</Label>
              <Input id="businessEntity" {...register("businessEntity")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="industry">{t("industry")}</Label>
              <Input id="industry" {...register("industry")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="yearsInBusiness">{t("yearsInBusiness")}</Label>
              <Input
                id="yearsInBusiness"
                type="number"
                {...register("yearsInBusiness")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amountRequested">{t("amountRequested")}</Label>
              <Input
                id="amountRequested"
                type="number"
                step="0.01"
                {...register("amountRequested")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="monthlyRevenueRange">
                {t("monthlyRevenueRange")}
              </Label>
              <Input
                id="monthlyRevenueRange"
                placeholder="$10k-50k"
                {...register("monthlyRevenueRange")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="financingType">{t("financingType")}</Label>
              <Input
                id="financingType"
                placeholder="Term Loan, Line of Credit..."
                {...register("financingType")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fundingPurpose">{t("fundingPurpose")}</Label>
              <Input id="fundingPurpose" {...register("fundingPurpose")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("rriStatus")}</Label>
              <Controller
                control={control}
                name="rriStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {rriStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tRriStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rriDocumentsRequested">
                {t("rriDocumentsRequested")}
              </Label>
              <Input
                id="rriDocumentsRequested"
                {...register("rriDocumentsRequested")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rriDocumentsReceived">
                {t("rriDocumentsReceived")}
              </Label>
              <Input
                id="rriDocumentsReceived"
                {...register("rriDocumentsReceived")}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="consentToShareInformation"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("consentToShareInformation")}</Label>
            </div>
          </div>
        </div>
      )}

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
