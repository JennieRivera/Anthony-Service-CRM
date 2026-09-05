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
  bookkeepingServiceTypes,
  immigrationServiceTypes,
  notaryModalityValues,
  idVerificationStatusValues,
  notaryCaseStatusValues,
  taxFilerTypeValues,
  taxJurisdictionValues,
  taxFilingStatusValues,
  taxCaseStatusValues,
  bookkeepingFrequencyValues,
  deliverableStatusValues,
  bookkeepingCaseStatusValues,
  immigrationCaseStatusValues,
  creditServiceTypes,
  consultingServiceTypes,
  creditAccountTypeValues,
  creditCaseStatusValues,
  consultingCaseStatusValues,
  formationServiceTypes,
  formationTypeValues,
  formationCaseStatusValues,
  type CaseFormValues,
} from "@/lib/validation/case";
import { serviceTypeValues } from "@/lib/validation/client";
import { paymentStatusValues } from "@/lib/validation/payment";
import type {
  Case,
  NotaryServiceDetails,
  TaxServiceDetails,
  BookkeepingServiceDetails,
  ImmigrationServiceDetails,
  CreditServiceDetails,
  ConsultingServiceDetails,
  BusinessFormationDetails,
} from "@/lib/db/schema";

export function CaseForm({
  caseRecord,
  notaryDetails,
  taxDetails,
  bookkeepingDetails,
  immigrationDetails,
  creditDetails,
  consultingDetails,
  formationDetails,
  clients,
  defaultClientId,
  onSubmit,
}: {
  caseRecord?: Case;
  notaryDetails?: NotaryServiceDetails | null;
  taxDetails?: TaxServiceDetails | null;
  bookkeepingDetails?: BookkeepingServiceDetails | null;
  immigrationDetails?: ImmigrationServiceDetails | null;
  creditDetails?: CreditServiceDetails | null;
  consultingDetails?: ConsultingServiceDetails | null;
  formationDetails?: BusinessFormationDetails | null;
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
  const tBookkeepingFrequency = useTranslations("BookkeepingFrequency");
  const tDeliverableStatus = useTranslations("DeliverableStatus");
  const tBookkeepingCaseStatus = useTranslations("BookkeepingCaseStatus");
  const tImmigrationCaseStatus = useTranslations("ImmigrationCaseStatus");
  const tCreditAccountType = useTranslations("CreditAccountType");
  const tCreditCaseStatus = useTranslations("CreditCaseStatus");
  const tConsultingCaseStatus = useTranslations("ConsultingCaseStatus");
  const tFormationType = useTranslations("FormationType");
  const tFormationCaseStatus = useTranslations("FormationCaseStatus");
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
      businessName: bookkeepingDetails?.businessName ?? "",
      entityType: bookkeepingDetails?.entityType ?? "",
      industry: bookkeepingDetails?.industry ?? "",
      bookkeepingFrequency: bookkeepingDetails?.frequency ?? "",
      accountingSoftware: bookkeepingDetails?.accountingSoftware ?? "",
      numberOfBankAccounts:
        bookkeepingDetails?.numberOfBankAccounts?.toString() ?? "",
      numberOfCreditCardAccounts:
        bookkeepingDetails?.numberOfCreditCardAccounts?.toString() ?? "",
      payrollUsed: bookkeepingDetails?.payrollUsed ?? false,
      monthlyRevenueRange: bookkeepingDetails?.monthlyRevenueRange ?? "",
      lastMonthReconciled: bookkeepingDetails?.lastMonthReconciled ?? "",
      cleanupRequired: bookkeepingDetails?.cleanupRequired ?? false,
      catchUpStartMonth: bookkeepingDetails?.catchUpStartMonth ?? "",
      catchUpEndMonth: bookkeepingDetails?.catchUpEndMonth ?? "",
      nextBillingDate: bookkeepingDetails?.nextBillingDate ?? "",
      reportsRequired: bookkeepingDetails?.reportsRequired ?? "",
      profitLossStatus: bookkeepingDetails?.profitLossStatus ?? "",
      balanceSheetStatus: bookkeepingDetails?.balanceSheetStatus ?? "",
      bookkeepingCaseStatus: bookkeepingDetails?.status ?? "lead",
      administrativeServiceType:
        immigrationDetails?.administrativeServiceType ?? "",
      formNumber: immigrationDetails?.formNumber ?? "",
      clientRequestedForm: immigrationDetails?.clientRequestedForm ?? false,
      clientProvidedInstructions:
        immigrationDetails?.clientProvidedInstructions ?? "",
      language: immigrationDetails?.language ?? "",
      translationNeeded: immigrationDetails?.translationNeeded ?? false,
      translationStatus: immigrationDetails?.translationStatus ?? "",
      attorneyReferralNeeded:
        immigrationDetails?.attorneyReferralNeeded ?? false,
      attorneyReferralDate: immigrationDetails?.attorneyReferralDate ?? "",
      governmentFilingFee: immigrationDetails?.governmentFilingFee ?? "",
      immigrationCaseStatus: immigrationDetails?.status ?? "new_inquiry",
      creditServiceType: creditDetails?.creditServiceType ?? "",
      accountType: creditDetails?.accountType ?? "",
      initialConsultationDate: creditDetails?.initialConsultationDate ?? "",
      creditEducationCompleted: creditDetails?.creditEducationCompleted ?? false,
      creditReportReviewDate: creditDetails?.creditReportReviewDate ?? "",
      mainClientGoal: creditDetails?.mainClientGoal ?? "",
      creditCaseStatus: creditDetails?.status ?? "new_inquiry",
      businessProblem: consultingDetails?.businessProblem ?? "",
      businessStage: consultingDetails?.businessStage ?? "",
      diagnosisSummary: consultingDetails?.diagnosisSummary ?? "",
      primaryGoal: consultingDetails?.primaryGoal ?? "",
      recommendedStrategy: consultingDetails?.recommendedStrategy ?? "",
      consultingPackage: consultingDetails?.consultingPackage ?? "",
      numberOfSessions: consultingDetails?.numberOfSessions?.toString() ?? "",
      sessionsCompleted:
        consultingDetails?.sessionsCompleted?.toString() ?? "",
      milestones: consultingDetails?.milestones ?? "",
      actionPlan: consultingDetails?.actionPlan ?? "",
      goal30Day: consultingDetails?.goal30Day ?? "",
      goal90Day: consultingDetails?.goal90Day ?? "",
      completionPercentage:
        consultingDetails?.completionPercentage?.toString() ?? "",
      consultingCaseStatus: consultingDetails?.status ?? "lead",
      formationType: formationDetails?.formationType ?? "",
      stateOfFormation: formationDetails?.stateOfFormation ?? "",
      formationBusinessName: formationDetails?.businessName ?? "",
      nameAvailabilityChecked:
        formationDetails?.nameAvailabilityChecked ?? false,
      registeredAgent: formationDetails?.registeredAgent ?? "",
      einAssistance: formationDetails?.einAssistance ?? false,
      stateFilingDate: formationDetails?.stateFilingDate ?? "",
      stateApprovalDate: formationDetails?.stateApprovalDate ?? "",
      documentDeliveryStatus: formationDetails?.documentDeliveryStatus ?? "",
      governmentFee: formationDetails?.governmentFee ?? "",
      formationCaseStatus: formationDetails?.status ?? "new_inquiry",
    },
  });

  const serviceType = watch("serviceType");
  const isNotary = notaryServiceTypes.includes(serviceType);
  const isTax = taxServiceTypes.includes(serviceType);
  const isBookkeeping = bookkeepingServiceTypes.includes(serviceType);
  const isImmigration = immigrationServiceTypes.includes(serviceType);
  const isCredit = creditServiceTypes.includes(serviceType);
  const isConsulting = consultingServiceTypes.includes(serviceType);
  const isFormation = formationServiceTypes.includes(serviceType);
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

        {!isNotary &&
          !isTax &&
          !isBookkeeping &&
          !isImmigration &&
          !isCredit &&
          !isConsulting &&
          !isFormation && (
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

      {isImmigration && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {tCases("immigrationDisclaimer")}
        </p>
      )}

      {isCredit && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {tCases("creditDisclaimer")}
        </p>
      )}

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

      {isBookkeeping && (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
          <h3 className="font-heading text-base text-foreground">
            {tCases("bookkeepingServiceDetails")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessName">{t("businessName")}</Label>
              <Input id="businessName" {...register("businessName")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entityType">{t("entityType")}</Label>
              <Input id="entityType" {...register("entityType")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="industry">{t("industry")}</Label>
              <Input id="industry" {...register("industry")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("bookkeepingFrequency")}</Label>
              <Controller
                control={control}
                name="bookkeepingFrequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {bookkeepingFrequencyValues.map((freq) => (
                        <SelectItem key={freq} value={freq}>
                          {tBookkeepingFrequency(freq)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("bookkeepingCaseStatus")}</Label>
              <Controller
                control={control}
                name="bookkeepingCaseStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {bookkeepingCaseStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tBookkeepingCaseStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="accountingSoftware">
                {t("accountingSoftware")}
              </Label>
              <Input
                id="accountingSoftware"
                placeholder="QuickBooks, Xero, Wave..."
                {...register("accountingSoftware")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="numberOfBankAccounts">
                {t("numberOfBankAccounts")}
              </Label>
              <Input
                id="numberOfBankAccounts"
                type="number"
                {...register("numberOfBankAccounts")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="numberOfCreditCardAccounts">
                {t("numberOfCreditCardAccounts")}
              </Label>
              <Input
                id="numberOfCreditCardAccounts"
                type="number"
                {...register("numberOfCreditCardAccounts")}
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="payrollUsed"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("payrollUsed")}</Label>
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
              <Label htmlFor="lastMonthReconciled">
                {t("lastMonthReconciled")}
              </Label>
              <Input
                id="lastMonthReconciled"
                type="date"
                {...register("lastMonthReconciled")}
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="cleanupRequired"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("cleanupRequired")}</Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catchUpStartMonth">
                {t("catchUpStartMonth")}
              </Label>
              <Input
                id="catchUpStartMonth"
                type="date"
                {...register("catchUpStartMonth")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catchUpEndMonth">{t("catchUpEndMonth")}</Label>
              <Input
                id="catchUpEndMonth"
                type="date"
                {...register("catchUpEndMonth")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nextBillingDate">{t("nextBillingDate")}</Label>
              <Input
                id="nextBillingDate"
                type="date"
                {...register("nextBillingDate")}
              />
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="reportsRequired">{t("reportsRequired")}</Label>
              <Input id="reportsRequired" {...register("reportsRequired")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("profitLossStatus")}</Label>
              <Controller
                control={control}
                name="profitLossStatus"
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
                      {deliverableStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tDeliverableStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("balanceSheetStatus")}</Label>
              <Controller
                control={control}
                name="balanceSheetStatus"
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
                      {deliverableStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tDeliverableStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </div>
      )}

      {isImmigration && (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
          <h3 className="font-heading text-base text-foreground">
            {tCases("immigrationServiceDetails")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="administrativeServiceType">
                {t("administrativeServiceType")}
              </Label>
              <Input
                id="administrativeServiceType"
                {...register("administrativeServiceType")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="formNumber">{t("formNumber")}</Label>
              <Input
                id="formNumber"
                placeholder="I-130, I-485, N-400..."
                {...register("formNumber")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("immigrationCaseStatus")}</Label>
              <Controller
                control={control}
                name="immigrationCaseStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {immigrationCaseStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tImmigrationCaseStatus(status)}
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
                name="clientRequestedForm"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("clientRequestedForm")}</Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="language">{t("language")}</Label>
              <Input id="language" {...register("language")} />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="translationNeeded"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("translationNeeded")}</Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("translationStatus")}</Label>
              <Controller
                control={control}
                name="translationStatus"
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
                      {deliverableStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tDeliverableStatus(status)}
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
                name="attorneyReferralNeeded"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("attorneyReferralNeeded")}</Label>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="attorneyReferralDate">
                {t("attorneyReferralDate")}
              </Label>
              <Input
                id="attorneyReferralDate"
                type="date"
                {...register("attorneyReferralDate")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="governmentFilingFee">
                {t("governmentFilingFee")}
              </Label>
              <Input
                id="governmentFilingFee"
                type="number"
                step="0.01"
                {...register("governmentFilingFee")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="clientProvidedInstructions">
              {t("clientProvidedInstructions")}
            </Label>
            <Textarea
              id="clientProvidedInstructions"
              rows={3}
              {...register("clientProvidedInstructions")}
            />
            <p className="text-xs text-muted-foreground">
              {t("noSensitiveDataWarning")}
            </p>
          </div>
        </div>
      )}

      {isCredit && (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
          <h3 className="font-heading text-base text-foreground">
            {tCases("creditServiceDetails")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="creditServiceType">
                {t("creditServiceType")}
              </Label>
              <Input
                id="creditServiceType"
                placeholder="Credit Repair, Credit Building..."
                {...register("creditServiceType")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("accountType")}</Label>
              <Controller
                control={control}
                name="accountType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {creditAccountTypeValues.map((type) => (
                        <SelectItem key={type} value={type}>
                          {tCreditAccountType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("creditCaseStatus")}</Label>
              <Controller
                control={control}
                name="creditCaseStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {creditCaseStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tCreditCaseStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="initialConsultationDate">
                {t("initialConsultationDate")}
              </Label>
              <Input
                id="initialConsultationDate"
                type="date"
                {...register("initialConsultationDate")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="creditReportReviewDate">
                {t("creditReportReviewDate")}
              </Label>
              <Input
                id="creditReportReviewDate"
                type="date"
                {...register("creditReportReviewDate")}
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="creditEducationCompleted"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("creditEducationCompleted")}</Label>
            </div>

            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="mainClientGoal">{t("mainClientGoal")}</Label>
              <Input id="mainClientGoal" {...register("mainClientGoal")} />
            </div>
          </div>
        </div>
      )}

      {isConsulting && (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
          <h3 className="font-heading text-base text-foreground">
            {tCases("consultingServiceDetails")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessStage">{t("businessStage")}</Label>
              <Input id="businessStage" {...register("businessStage")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="consultingPackage">
                {t("consultingPackage")}
              </Label>
              <Input
                id="consultingPackage"
                {...register("consultingPackage")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("consultingCaseStatus")}</Label>
              <Controller
                control={control}
                name="consultingCaseStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {consultingCaseStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tConsultingCaseStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="numberOfSessions">
                {t("numberOfSessions")}
              </Label>
              <Input
                id="numberOfSessions"
                type="number"
                {...register("numberOfSessions")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sessionsCompleted">
                {t("sessionsCompleted")}
              </Label>
              <Input
                id="sessionsCompleted"
                type="number"
                {...register("sessionsCompleted")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="completionPercentage">
                {t("completionPercentage")}
              </Label>
              <Input
                id="completionPercentage"
                type="number"
                min="0"
                max="100"
                {...register("completionPercentage")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal30Day">{t("goal30Day")}</Label>
              <Input id="goal30Day" {...register("goal30Day")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal90Day">{t("goal90Day")}</Label>
              <Input id="goal90Day" {...register("goal90Day")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="businessProblem">{t("businessProblem")}</Label>
              <Textarea
                id="businessProblem"
                rows={2}
                {...register("businessProblem")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="diagnosisSummary">
                {t("diagnosisSummary")}
              </Label>
              <Textarea
                id="diagnosisSummary"
                rows={2}
                {...register("diagnosisSummary")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="primaryGoal">{t("primaryGoal")}</Label>
              <Textarea
                id="primaryGoal"
                rows={2}
                {...register("primaryGoal")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recommendedStrategy">
                {t("recommendedStrategy")}
              </Label>
              <Textarea
                id="recommendedStrategy"
                rows={2}
                {...register("recommendedStrategy")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="milestones">{t("milestones")}</Label>
              <Textarea id="milestones" rows={2} {...register("milestones")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="actionPlan">{t("actionPlan")}</Label>
              <Textarea id="actionPlan" rows={2} {...register("actionPlan")} />
            </div>
          </div>
        </div>
      )}

      {isFormation && (
        <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-4">
          <h3 className="font-heading text-base text-foreground">
            {tCases("businessFormationDetails")}
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>{t("formationType")}</Label>
              <Controller
                control={control}
                name="formationType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formationTypeValues.map((type) => (
                        <SelectItem key={type} value={type}>
                          {tFormationType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stateOfFormation">
                {t("stateOfFormation")}
              </Label>
              <Input
                id="stateOfFormation"
                {...register("stateOfFormation")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="formationBusinessName">
                {t("formationBusinessName")}
              </Label>
              <Input
                id="formationBusinessName"
                {...register("formationBusinessName")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("formationCaseStatus")}</Label>
              <Controller
                control={control}
                name="formationCaseStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formationCaseStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tFormationCaseStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="registeredAgent">{t("registeredAgent")}</Label>
              <Input id="registeredAgent" {...register("registeredAgent")} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t("documentDeliveryStatus")}</Label>
              <Controller
                control={control}
                name="documentDeliveryStatus"
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
                      {deliverableStatusValues.map((status) => (
                        <SelectItem key={status} value={status}>
                          {tDeliverableStatus(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stateFilingDate">{t("stateFilingDate")}</Label>
              <Input
                id="stateFilingDate"
                type="date"
                {...register("stateFilingDate")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stateApprovalDate">
                {t("stateApprovalDate")}
              </Label>
              <Input
                id="stateApprovalDate"
                type="date"
                {...register("stateApprovalDate")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="governmentFee">{t("governmentFee")}</Label>
              <Input
                id="governmentFee"
                type="number"
                step="0.01"
                {...register("governmentFee")}
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="nameAvailabilityChecked"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("nameAvailabilityChecked")}</Label>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <Controller
                control={control}
                name="einAssistance"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>{t("einAssistance")}</Label>
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
