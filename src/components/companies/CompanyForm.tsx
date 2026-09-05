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
  companyFormSchema,
  companyEntityTypeValues,
  companyEinStatusValues,
  companyAccountingMethodValues,
  type CompanyFormValues,
} from "@/lib/validation/company";
import type { Company } from "@/lib/db/schema";

export function CompanyForm({
  company,
  onSubmit,
}: {
  company?: Company;
  onSubmit: (values: CompanyFormValues) => Promise<void>;
}) {
  const t = useTranslations("Companies.form");
  const tEntityType = useTranslations("CompanyEntityType");
  const tEinStatus = useTranslations("CompanyEinStatus");
  const tAccountingMethod = useTranslations("CompanyAccountingMethod");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } =
    useForm<CompanyFormValues>({
      resolver: zodResolver(companyFormSchema),
      defaultValues: {
        legalBusinessName: company?.legalBusinessName ?? "",
        dbaName: company?.dbaName ?? "",
        entityType: company?.entityType ?? "",
        stateOfFormation: company?.stateOfFormation ?? "",
        formationDate: company?.formationDate ?? "",
        stateDocumentNumber: company?.stateDocumentNumber ?? "",
        einStatus: company?.einStatus ?? "not_started",
        einLast4: company?.einLast4 ?? "",
        registeredAgent: company?.registeredAgent ?? "",
        registeredAgentAddress: company?.registeredAgentAddress ?? "",
        principalBusinessAddress: company?.principalBusinessAddress ?? "",
        mailingAddress: company?.mailingAddress ?? "",
        phone: company?.phone ?? "",
        email: company?.email ?? "",
        website: company?.website ?? "",
        industry: company?.industry ?? "",
        naicsCode: company?.naicsCode ?? "",
        businessDescription: company?.businessDescription ?? "",
        yearsInBusiness: company?.yearsInBusiness?.toString() ?? "",
        numberOfEmployees: company?.numberOfEmployees?.toString() ?? "",
        annualRevenueRange: company?.annualRevenueRange ?? "",
        monthlyRevenueRange: company?.monthlyRevenueRange ?? "",
        fiscalYearEnd: company?.fiscalYearEnd ?? "",
        accountingMethod: company?.accountingMethod ?? "",
        bookkeepingSoftware: company?.bookkeepingSoftware ?? "",
        payrollProvider: company?.payrollProvider ?? "",
        salesTaxRequired: company?.salesTaxRequired ?? false,
        salesTaxStates: company?.salesTaxStates?.join(", ") ?? "",
        licensesRequired: company?.licensesRequired ?? "",
        insuranceStatus: company?.insuranceStatus ?? "",
        bankingRelationship: company?.bankingRelationship ?? "",
        businessCreditStatus: company?.businessCreditStatus ?? "",
        fundingNeeds: company?.fundingNeeds ?? "",
        notes: company?.notes ?? "",
      },
    });

  async function submit(values: CompanyFormValues) {
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
      <div className="flex flex-col gap-4 rounded-md border border-border p-4">
        <h3 className="font-heading text-base text-foreground">
          {t("sectionIdentity")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="legalBusinessName">{t("legalBusinessName")}</Label>
            <Input id="legalBusinessName" {...register("legalBusinessName")} />
            {errors.legalBusinessName && (
              <p className="text-sm text-destructive">
                {errors.legalBusinessName.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dbaName">{t("dbaName")}</Label>
            <Input id="dbaName" {...register("dbaName")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("entityType")}</Label>
            <Controller
              control={control}
              name="entityType"
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("notSet")}</SelectItem>
                    {companyEntityTypeValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {tEntityType(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stateOfFormation">{t("stateOfFormation")}</Label>
            <Input id="stateOfFormation" placeholder="FL" {...register("stateOfFormation")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="formationDate">{t("formationDate")}</Label>
            <Input id="formationDate" type="date" {...register("formationDate")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stateDocumentNumber">{t("stateDocumentNumber")}</Label>
            <Input id="stateDocumentNumber" {...register("stateDocumentNumber")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("einStatus")}</Label>
            <Controller
              control={control}
              name="einStatus"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {companyEinStatusValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {tEinStatus(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="einLast4">{t("einLast4")}</Label>
            <Input id="einLast4" maxLength={4} placeholder="1234" {...register("einLast4")} />
            {errors.einLast4 && (
              <p className="text-sm text-destructive">{errors.einLast4.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="registeredAgent">{t("registeredAgent")}</Label>
            <Input id="registeredAgent" {...register("registeredAgent")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="registeredAgentAddress">
              {t("registeredAgentAddress")}
            </Label>
            <Input id="registeredAgentAddress" {...register("registeredAgentAddress")} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-md border border-border p-4">
        <h3 className="font-heading text-base text-foreground">
          {t("sectionContact")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="principalBusinessAddress">
              {t("principalBusinessAddress")}
            </Label>
            <Input id="principalBusinessAddress" {...register("principalBusinessAddress")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mailingAddress">{t("mailingAddress")}</Label>
            <Input id="mailingAddress" {...register("mailingAddress")} />
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
            <Input id="website" placeholder="https://" {...register("website")} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-md border border-border p-4">
        <h3 className="font-heading text-base text-foreground">
          {t("sectionBusiness")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="industry">{t("industry")}</Label>
            <Input id="industry" {...register("industry")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="naicsCode">{t("naicsCode")}</Label>
            <Input id="naicsCode" {...register("naicsCode")} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="businessDescription">{t("businessDescription")}</Label>
            <Textarea id="businessDescription" rows={2} {...register("businessDescription")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="yearsInBusiness">{t("yearsInBusiness")}</Label>
            <Input id="yearsInBusiness" type="number" min="0" {...register("yearsInBusiness")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="numberOfEmployees">{t("numberOfEmployees")}</Label>
            <Input id="numberOfEmployees" type="number" min="0" {...register("numberOfEmployees")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="annualRevenueRange">{t("annualRevenueRange")}</Label>
            <Input id="annualRevenueRange" placeholder="$100k-250k" {...register("annualRevenueRange")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="monthlyRevenueRange">{t("monthlyRevenueRange")}</Label>
            <Input id="monthlyRevenueRange" placeholder="$10k-25k" {...register("monthlyRevenueRange")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fiscalYearEnd">{t("fiscalYearEnd")}</Label>
            <Input id="fiscalYearEnd" placeholder="December 31" {...register("fiscalYearEnd")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("accountingMethod")}</Label>
            <Controller
              control={control}
              name="accountingMethod"
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("notSet")}</SelectItem>
                    {companyAccountingMethodValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {tAccountingMethod(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bookkeepingSoftware">{t("bookkeepingSoftware")}</Label>
            <Input id="bookkeepingSoftware" {...register("bookkeepingSoftware")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="payrollProvider">{t("payrollProvider")}</Label>
            <Input id="payrollProvider" {...register("payrollProvider")} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-md border border-border p-4">
        <h3 className="font-heading text-base text-foreground">
          {t("sectionCompliance")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2 pt-6">
            <Controller
              control={control}
              name="salesTaxRequired"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label>{t("salesTaxRequired")}</Label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="salesTaxStates">{t("salesTaxStates")}</Label>
            <Input id="salesTaxStates" placeholder="FL, GA, NY" {...register("salesTaxStates")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="licensesRequired">{t("licensesRequired")}</Label>
            <Input id="licensesRequired" {...register("licensesRequired")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="insuranceStatus">{t("insuranceStatus")}</Label>
            <Input id="insuranceStatus" {...register("insuranceStatus")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bankingRelationship">{t("bankingRelationship")}</Label>
            <Input id="bankingRelationship" {...register("bankingRelationship")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="businessCreditStatus">{t("businessCreditStatus")}</Label>
            <Input id="businessCreditStatus" {...register("businessCreditStatus")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fundingNeeds">{t("fundingNeeds")}</Label>
            <Input id="fundingNeeds" {...register("fundingNeeds")} />
          </div>
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
