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
  caseFormSchema,
  caseStatusValues,
  notarialActTypeValues,
  idVerificationMethodValues,
  notaryServiceTypes,
  taxServiceTypes,
  notaryModalityValues,
  idVerificationStatusValues,
  notaryCaseStatusValues,
  taxFilerTypeValues,
  taxJurisdictionValues,
  taxFilingStatusValues,
  taxCaseStatusValues,
  type CaseFormValues,
} from "@/lib/validation/case";
import { serviceTypeValues } from "@/lib/validation/client";
import { paymentStatusValues } from "@/lib/validation/payment";
import type {
  Case,
  NotaryServiceDetails,
  TaxServiceDetails,
} from "@/lib/db/schema";

export function CaseForm({
  caseRecord,
  notaryDetails,
  taxDetails,
  clients,
  defaultClientId,
  onSubmit,
}: {
  caseRecord?: Case;
  notaryDetails?: NotaryServiceDetails | null;
  taxDetails?: TaxServiceDetails | null;
  clients: { id: string; fullName: string }[];
  defaultClientId?: string;
  onSubmit: (values: CaseFormValues) => Promise<void>;
}) {
  const t = useTranslations("Cases.form");
  const tStatus = useTranslations("CaseStatus");
  const tService = useTranslations("ServiceType");
  const tActType = useTranslations("NotarialActType");
  const tIdMethod = useTranslations("IdVerificationMethod");
  const tPaymentStatus = useTranslations("PaymentStatus");
  const tCases = useTranslations("Cases");
  const tNotaryModality = useTranslations("NotaryModality");
  const tIdVerificationStatus = useTranslations("IdVerificationStatus");
  const tNotaryCaseStatus = useTranslations("NotaryCaseStatus");
  const tTaxFilerType = useTranslations("TaxFilerType");
  const tTaxJurisdiction = useTranslations("TaxJurisdiction");
  const tTaxFilingStatus = useTranslations("TaxFilingStatus");
  const tTaxCaseStatus = useTranslations("TaxCaseStatus");
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
      startDate: caseRecord?.startDate ?? new Date().toISOString().slice(0, 10),
      nextFollowUpDate: caseRecord?.nextFollowUpDate ?? "",
      documentsRequested: caseRecord?.documentsRequested ?? "",
      documentsReceived: caseRecord?.documentsReceived ?? "",
      paymentStatus: caseRecord?.paymentStatus ?? "",
      referralSource: caseRecord?.referralSource ?? "",
      nextAction: caseRecord?.nextAction ?? "",
      notaryDocumentType: "",
      notarialActType: undefined,
      idVerificationMethod: undefined,
      notaryFeeCharged: "",
      destinationCountry: "",
      instrumentType: "",
      submissionDate: "",
      expectedReturnDate: "",
      actualReturnDate: "",
      notaryModality: notaryDetails?.modality ?? "",
      appointmentDate: notaryDetails?.appointmentDate ?? "",
      appointmentTime: notaryDetails?.appointmentTime ?? "",
      location: notaryDetails?.location ?? "",
      numberOfSigners: notaryDetails?.numberOfSigners?.toString() ?? "",
      numberOfDocuments: notaryDetails?.numberOfDocuments?.toString() ?? "",
      numberOfNotarialActs:
        notaryDetails?.numberOfNotarialActs?.toString() ?? "",
      idVerificationStatus: notaryDetails?.idVerificationStatus ?? "",
      witnessRequired: notaryDetails?.witnessRequired ?? false,
      witnessProvidedBy: notaryDetails?.witnessProvidedBy ?? "",
      loanSigningCompany: notaryDetails?.loanSigningCompany ?? "",
      titleCompany: notaryDetails?.titleCompany ?? "",
      signingService: notaryDetails?.signingService ?? "",
      scanbacksRequired: notaryDetails?.scanbacksRequired ?? false,
      shippingRequired: notaryDetails?.shippingRequired ?? false,
      trackingNumber: notaryDetails?.trackingNumber ?? "",
      notaryServiceFee: notaryDetails?.notaryFee ?? "",
      travelFee: notaryDetails?.travelFee ?? "",
      printingFee: notaryDetails?.printingFee ?? "",
      notaryCaseStatus: notaryDetails?.status ?? "new_request",
      taxYear: taxDetails?.taxYear?.toString() ?? new Date().getFullYear().toString(),
      filerType: taxDetails?.filerType ?? "",
      jurisdiction: taxDetails?.jurisdiction ?? "federal",
      returnType: taxDetails?.returnType ?? "",
      filingStatus: taxDetails?.filingStatus ?? "",
      businessEntityType: taxDetails?.businessEntityType ?? "",
      intakeCompleted: taxDetails?.intakeCompleted ?? false,
      efileAuthorizationSigned: taxDetails?.efileAuthorizationSigned ?? false,
      refundAmount: taxDetails?.refundAmount ?? "",
      balanceDueAmount: taxDetails?.balanceDueAmount ?? "",
      taxAmountPaid: taxDetails?.amountPaid ?? "",
      internalNotes: taxDetails?.internalNotes ?? "",
      taxCaseStatus: taxDetails?.status ?? "new_client",
    },
  });

  const serviceType = watch("serviceType");
  const isNotary = notaryServiceTypes.includes(serviceType);
  const isTax = taxServiceTypes.includes(serviceType);
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

        {!isNotary && !isTax && (
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
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dueDate">{t("dueDate")}</Label>
          <Input id="dueDate" type="date" {...register("dueDate")} />
        </div>

        {!isNotary && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fee">{t("fee")}</Label>
            <Input id="fee" type="number" step="0.01" {...register("fee")} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
        <h3 className="font-heading text-base text-foreground">
          {tCases("trackingDetails")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startDate">{t("startDate")}</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
            {errors.startDate && (
              <p className="text-sm text-destructive">
                {errors.startDate.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nextFollowUpDate">{t("nextFollowUpDate")}</Label>
            <Input
              id="nextFollowUpDate"
              type="date"
              {...register("nextFollowUpDate")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("paymentStatus")}</Label>
            <Controller
              control={control}
              name="paymentStatus"
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
                    {paymentStatusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        {tPaymentStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="referralSource">{t("referralSource")}</Label>
            <Input id="referralSource" {...register("referralSource")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="documentsRequested">
              {t("documentsRequested")}
            </Label>
            <Input
              id="documentsRequested"
              {...register("documentsRequested")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="documentsReceived">{t("documentsReceived")}</Label>
            <Input id="documentsReceived" {...register("documentsReceived")} />
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="nextAction">{t("nextAction")}</Label>
            <Input id="nextAction" {...register("nextAction")} />
          </div>
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

      {isNotary && (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
          <h3 className="font-heading text-base text-foreground">
            {tCases("notaryServiceDetails")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("modality")}</Label>
              <Controller
                control={control}
                name="notaryModality"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("selectModality")} />
                    </SelectTrigger>
                    <SelectContent>
                      {notaryModalityValues.map((modality) => (
                        <SelectItem key={modality} value={modality}>
                          {tNotaryModality(modality)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("notaryCaseStatus")}</Label>
              <Controller
                control={control}
                name="notaryCaseStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notaryCaseStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tNotaryCaseStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("idVerificationStatus")}</Label>
              <Controller
                control={control}
                name="idVerificationStatus"
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
                      {idVerificationStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tIdVerificationStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appointmentDate">{t("appointmentDate")}</Label>
              <Input
                id="appointmentDate"
                type="date"
                {...register("appointmentDate")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="appointmentTime">{t("appointmentTime")}</Label>
              <Input
                id="appointmentTime"
                type="time"
                {...register("appointmentTime")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="location">{t("location")}</Label>
              <Input id="location" {...register("location")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="numberOfSigners">{t("numberOfSigners")}</Label>
              <Input
                id="numberOfSigners"
                type="number"
                {...register("numberOfSigners")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="numberOfDocuments">
                {t("numberOfDocuments")}
              </Label>
              <Input
                id="numberOfDocuments"
                type="number"
                {...register("numberOfDocuments")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="numberOfNotarialActs">
                {t("numberOfNotarialActs")}
              </Label>
              <Input
                id="numberOfNotarialActs"
                type="number"
                {...register("numberOfNotarialActs")}
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="witnessRequired"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("witnessRequired")}</Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="witnessProvidedBy">
                {t("witnessProvidedBy")}
              </Label>
              <Input
                id="witnessProvidedBy"
                {...register("witnessProvidedBy")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loanSigningCompany">
                {t("loanSigningCompany")}
              </Label>
              <Input
                id="loanSigningCompany"
                {...register("loanSigningCompany")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="titleCompany">{t("titleCompany")}</Label>
              <Input id="titleCompany" {...register("titleCompany")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="signingService">{t("signingService")}</Label>
              <Input id="signingService" {...register("signingService")} />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="scanbacksRequired"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("scanbacksRequired")}</Label>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="shippingRequired"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("shippingRequired")}</Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="trackingNumber">{t("trackingNumber")}</Label>
              <Input id="trackingNumber" {...register("trackingNumber")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notaryServiceFee">{t("notaryServiceFee")}</Label>
              <Input
                id="notaryServiceFee"
                type="number"
                step="0.01"
                {...register("notaryServiceFee")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="travelFee">{t("travelFee")}</Label>
              <Input
                id="travelFee"
                type="number"
                step="0.01"
                {...register("travelFee")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="printingFee">{t("printingFee")}</Label>
              <Input
                id="printingFee"
                type="number"
                step="0.01"
                {...register("printingFee")}
              />
            </div>
          </div>
          <div className="flex justify-end text-lg font-medium text-foreground">
            {t("totalFee")}: $
            {(
              (Number(watch("notaryServiceFee")) || 0) +
              (Number(watch("travelFee")) || 0) +
              (Number(watch("printingFee")) || 0)
            ).toFixed(2)}
          </div>
        </div>
      )}

      {isTax && (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
          <h3 className="font-heading text-base text-foreground">
            {tCases("taxServiceDetails")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taxYear">{t("taxYear")}</Label>
              <Input id="taxYear" type="number" {...register("taxYear")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("filerType")}</Label>
              <Controller
                control={control}
                name="filerType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taxFilerTypeValues.map((type) => (
                        <SelectItem key={type} value={type}>
                          {tTaxFilerType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("jurisdiction")}</Label>
              <Controller
                control={control}
                name="jurisdiction"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taxJurisdictionValues.map((j) => (
                        <SelectItem key={j} value={j}>
                          {tTaxJurisdiction(j)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="returnType">{t("returnType")}</Label>
              <Input
                id="returnType"
                placeholder="1040, 1120, Schedule C..."
                {...register("returnType")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("filingStatus")}</Label>
              <Controller
                control={control}
                name="filingStatus"
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
                      {taxFilingStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tTaxFilingStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessEntityType">
                {t("businessEntityType")}
              </Label>
              <Input
                id="businessEntityType"
                {...register("businessEntityType")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("taxCaseStatus")}</Label>
              <Controller
                control={control}
                name="taxCaseStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taxCaseStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tTaxCaseStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="intakeCompleted"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("intakeCompleted")}</Label>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="efileAuthorizationSigned"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("efileAuthorizationSigned")}</Label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="refundAmount">{t("refundAmount")}</Label>
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                {...register("refundAmount")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="balanceDueAmount">{t("balanceDueAmount")}</Label>
              <Input
                id="balanceDueAmount"
                type="number"
                step="0.01"
                {...register("balanceDueAmount")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="taxAmountPaid">{t("taxAmountPaid")}</Label>
              <Input
                id="taxAmountPaid"
                type="number"
                step="0.01"
                {...register("taxAmountPaid")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="internalNotes">{t("internalNotes")}</Label>
            <Textarea id="internalNotes" rows={3} {...register("internalNotes")} />
            <p className="text-xs text-muted-foreground">
              {t("noSensitiveDataWarning")}
            </p>
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
