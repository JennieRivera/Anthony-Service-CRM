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
  allianceFormSchema,
  organizationTypeValues,
  allianceStatusValues,
  type AllianceFormValues,
} from "@/lib/validation/alliance";
import type { StrategicAlliance } from "@/lib/db/schema";

export function AllianceForm({
  alliance,
  onSubmit,
}: {
  alliance?: StrategicAlliance;
  onSubmit: (values: AllianceFormValues) => Promise<void>;
}) {
  const t = useTranslations("Alliances.form");
  const tStatus = useTranslations("AllianceStatus");
  const tOrgType = useTranslations("OrganizationType");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AllianceFormValues>({
    resolver: zodResolver(allianceFormSchema),
    defaultValues: {
      organizationName: alliance?.organizationName ?? "",
      contactPerson: alliance?.contactPerson ?? "",
      organizationType: alliance?.organizationType ?? "",
      phone: alliance?.phone ?? "",
      email: alliance?.email ?? "",
      website: alliance?.website ?? "",
      state: alliance?.state ?? "",
      country: alliance?.country ?? "",
      relationshipOwner: alliance?.relationshipOwner ?? "",
      dateIntroduced: alliance?.dateIntroduced ?? "",
      servicesConnected: alliance?.servicesConnected ?? "",
      referralAgreement: alliance?.referralAgreement ?? false,
      commissionAgreement: alliance?.commissionAgreement ?? false,
      marketingPermission: alliance?.marketingPermission ?? false,
      logoPermission: alliance?.logoPermission ?? false,
      lastContact: alliance?.lastContact ?? "",
      nextFollowUp: alliance?.nextFollowUp ?? "",
      status: alliance?.status ?? "prospect",
      notes: alliance?.notes ?? "",
    },
  });

  async function submit(values: AllianceFormValues) {
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
          <Label htmlFor="organizationName">{t("organizationName")}</Label>
          <Input id="organizationName" {...register("organizationName")} />
          {errors.organizationName && (
            <p className="text-sm text-destructive">
              {errors.organizationName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("organizationType")}</Label>
          <Controller
            control={control}
            name="organizationType"
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
                  <SelectItem value="none">—</SelectItem>
                  {organizationTypeValues.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tOrgType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contactPerson">{t("contactPerson")}</Label>
          <Input id="contactPerson" {...register("contactPerson")} />
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
                  {allianceStatusValues.map((status) => (
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
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" {...register("phone")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" type="email" {...register("email")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="website">{t("website")}</Label>
          <Input id="website" {...register("website")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="relationshipOwner">
            {t("relationshipOwner")}
          </Label>
          <Input id="relationshipOwner" {...register("relationshipOwner")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">{t("state")}</Label>
          <Input id="state" {...register("state")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">{t("country")}</Label>
          <Input id="country" {...register("country")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateIntroduced">{t("dateIntroduced")}</Label>
          <Input
            id="dateIntroduced"
            type="date"
            {...register("dateIntroduced")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="servicesConnected">
            {t("servicesConnected")}
          </Label>
          <Input id="servicesConnected" {...register("servicesConnected")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastContact">{t("lastContact")}</Label>
          <Input id="lastContact" type="date" {...register("lastContact")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nextFollowUp">{t("nextFollowUp")}</Label>
          <Input
            id="nextFollowUp"
            type="date"
            {...register("nextFollowUp")}
          />
        </div>
      </div>

      <div className="grid gap-3 rounded-md border border-border p-4 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="referralAgreement"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label>{t("referralAgreement")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="commissionAgreement"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label>{t("commissionAgreement")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="marketingPermission"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label>{t("marketingPermission")}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Controller
            control={control}
            name="logoPermission"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label>{t("logoPermission")}</Label>
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
