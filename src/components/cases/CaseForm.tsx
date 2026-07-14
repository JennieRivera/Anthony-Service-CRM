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
  caseFormSchema,
  caseStatusValues,
  notarialActTypeValues,
  idVerificationMethodValues,
  notaryServiceTypes,
  type CaseFormValues,
} from "@/lib/validation/case";
import { serviceTypeValues } from "@/lib/validation/client";
import type { Case } from "@/lib/db/schema";

export function CaseForm({
  caseRecord,
  clients,
  defaultClientId,
  onSubmit,
}: {
  caseRecord?: Case;
  clients: { id: string; fullName: string }[];
  defaultClientId?: string;
  onSubmit: (values: CaseFormValues) => Promise<void>;
}) {
  const t = useTranslations("Cases.form");
  const tStatus = useTranslations("CaseStatus");
  const tService = useTranslations("ServiceType");
  const tActType = useTranslations("NotarialActType");
  const tIdMethod = useTranslations("IdVerificationMethod");
  const tCases = useTranslations("Cases");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      clientId: caseRecord?.clientId ?? defaultClientId ?? "",
      serviceType: caseRecord?.serviceType ?? "online_notary",
      status: caseRecord?.status ?? "new",
      title: caseRecord?.title ?? "",
      dueDate: caseRecord?.dueDate ?? "",
      fee: caseRecord?.fee ?? "",
      notes: caseRecord?.notes ?? "",
      notaryDocumentType: "",
      notarialActType: undefined,
      idVerificationMethod: undefined,
      notaryFeeCharged: "",
      destinationCountry: "",
      instrumentType: "",
      submissionDate: "",
      expectedReturnDate: "",
      actualReturnDate: "",
    },
  });

  const serviceType = watch("serviceType");
  const isNotary = notaryServiceTypes.includes(serviceType);
  // Apostille / authentication fields are an optional add-on for Document Prep cases.
  const isApostille = serviceType === "document_prep";

  async function submit(values: CaseFormValues) {
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
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="title">{t("title")}</Label>
          <Input id="title" {...register("title")} />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

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
          <Label>{t("serviceType")}</Label>
          <Controller
            control={control}
            name="serviceType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypeValues.map((service) => (
                    <SelectItem key={service} value={service}>
                      {tService(service)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
                  {caseStatusValues.map((status) => (
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
          <Label htmlFor="dueDate">{t("dueDate")}</Label>
          <Input id="dueDate" type="date" {...register("dueDate")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fee">{t("fee")}</Label>
          <Input id="fee" type="number" step="0.01" {...register("fee")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      {isNotary && (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
          <h3 className="font-heading text-base text-foreground">
            {tCases("notaryJournal")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notaryDocumentType">{t("documentType")}</Label>
              <Input
                id="notaryDocumentType"
                {...register("notaryDocumentType")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("notarialActType")}</Label>
              <Controller
                control={control}
                name="notarialActType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notarialActTypeValues.map((type) => (
                        <SelectItem key={type} value={type}>
                          {tActType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("idVerificationMethod")}</Label>
              <Controller
                control={control}
                name="idVerificationMethod"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {idVerificationMethodValues.map((method) => (
                        <SelectItem key={method} value={method}>
                          {tIdMethod(method)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notaryFeeCharged">{t("feeCharged")}</Label>
              <Input
                id="notaryFeeCharged"
                type="number"
                step="0.01"
                {...register("notaryFeeCharged")}
              />
            </div>
          </div>
        </div>
      )}

      {isApostille && (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
          <h3 className="font-heading text-base text-foreground">
            {tCases("apostilleDetails")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="destinationCountry">
                {t("destinationCountry")}
              </Label>
              <Input
                id="destinationCountry"
                {...register("destinationCountry")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instrumentType">{t("instrumentType")}</Label>
              <Input id="instrumentType" {...register("instrumentType")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="submissionDate">{t("submissionDate")}</Label>
              <Input
                id="submissionDate"
                type="date"
                {...register("submissionDate")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expectedReturnDate">
                {t("expectedReturnDate")}
              </Label>
              <Input
                id="expectedReturnDate"
                type="date"
                {...register("expectedReturnDate")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actualReturnDate">
                {t("actualReturnDate")}
              </Label>
              <Input
                id="actualReturnDate"
                type="date"
                {...register("actualReturnDate")}
              />
            </div>
          </div>
        </div>
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
