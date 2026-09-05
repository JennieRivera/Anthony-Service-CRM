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
  associationChamberFormSchema,
  associationOrganizationTypeValues,
  associationRelationshipStatusValues,
  type AssociationChamberFormValues,
} from "@/lib/validation/associationChamber";
import type { AssociationChamber } from "@/lib/db/schema";

export function AssociationChamberForm({
  organization,
  onSubmit,
}: {
  organization?: AssociationChamber;
  onSubmit: (values: AssociationChamberFormValues) => Promise<void>;
}) {
  const t = useTranslations("Associations.form");
  const tOrgType = useTranslations("AssociationOrganizationType");
  const tStatus = useTranslations("AssociationRelationshipStatus");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AssociationChamberFormValues>({
    resolver: zodResolver(associationChamberFormSchema),
    defaultValues: {
      organizationName: organization?.organizationName ?? "",
      organizationType: organization?.organizationType ?? "other",
      state: organization?.state ?? "",
      city: organization?.city ?? "",
      country: organization?.country ?? "",
      website: organization?.website ?? "",
      phone: organization?.phone ?? "",
      email: organization?.email ?? "",
      contactPerson: organization?.contactPerson ?? "",
      industryFocus: organization?.industryFocus ?? "",
      latinoFocus: organization?.latinoFocus ?? false,
      membershipStatus: organization?.membershipStatus ?? "",
      membershipCost: organization?.membershipCost ?? "",
      amsRelationshipStatus: organization?.amsRelationshipStatus ?? "research",
      dateContacted: organization?.dateContacted ?? "",
      lastContact: organization?.lastContact ?? "",
      nextFollowUp: organization?.nextFollowUp ?? "",
      partnershipOpportunity: organization?.partnershipOpportunity ?? "",
      notes: organization?.notes ?? "",
    },
  });

  async function submit(values: AssociationChamberFormValues) {
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
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {associationOrganizationTypeValues.map((type) => (
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
          <Label>{t("amsRelationshipStatus")}</Label>
          <Controller
            control={control}
            name="amsRelationshipStatus"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {associationRelationshipStatusValues.map((status) => (
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
          <Label htmlFor="contactPerson">{t("contactPerson")}</Label>
          <Input id="contactPerson" {...register("contactPerson")} />
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
          <Label htmlFor="city">{t("city")}</Label>
          <Input id="city" {...register("city")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="state">{t("state")}</Label>
          <Input id="state" maxLength={2} placeholder="FL" {...register("state")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">{t("country")}</Label>
          <Input id="country" {...register("country")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="industryFocus">{t("industryFocus")}</Label>
          <Input id="industryFocus" {...register("industryFocus")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="membershipStatus">{t("membershipStatus")}</Label>
          <Input id="membershipStatus" {...register("membershipStatus")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="membershipCost">{t("membershipCost")}</Label>
          <Input id="membershipCost" placeholder="$250/year" {...register("membershipCost")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateContacted">{t("dateContacted")}</Label>
          <Input id="dateContacted" type="date" {...register("dateContacted")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastContact">{t("lastContact")}</Label>
          <Input id="lastContact" type="date" {...register("lastContact")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nextFollowUp">{t("nextFollowUp")}</Label>
          <Input id="nextFollowUp" type="date" {...register("nextFollowUp")} />
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Controller
            control={control}
            name="latinoFocus"
            render={({ field }) => (
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
          <Label>{t("latinoFocus")}</Label>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="partnershipOpportunity">
          {t("partnershipOpportunity")}
        </Label>
        <Textarea
          id="partnershipOpportunity"
          rows={2}
          {...register("partnershipOpportunity")}
        />
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
