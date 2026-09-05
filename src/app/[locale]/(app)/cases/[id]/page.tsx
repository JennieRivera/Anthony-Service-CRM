import { notFound } from "next/navigation";
import { Pencil, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCaseById } from "@/lib/queries/cases";
import { findActiveTemplate } from "@/lib/queries/messageTemplates";
import { isBlobConfigured } from "@/lib/blob/config";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CaseStatusBadge } from "@/components/clients/StatusBadge";
import { DocumentList } from "@/components/documents/DocumentList";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { Badge } from "@/components/ui/badge";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Cases");
  const tService = await getTranslations("ServiceType");
  const tActType = await getTranslations("NotarialActType");
  const tIdMethod = await getTranslations("IdVerificationMethod");
  const tPaymentStatus = await getTranslations("PaymentStatus");
  const tDocuments = await getTranslations("Documents");
  const tNotaryModality = await getTranslations("NotaryModality");
  const tIdVerificationStatus = await getTranslations("IdVerificationStatus");
  const tNotaryCaseStatus = await getTranslations("NotaryCaseStatus");
  const tTaxFilerType = await getTranslations("TaxFilerType");
  const tTaxJurisdiction = await getTranslations("TaxJurisdiction");
  const tTaxFilingStatus = await getTranslations("TaxFilingStatus");
  const tTaxCaseStatus = await getTranslations("TaxCaseStatus");
  const tBookkeepingFrequency = await getTranslations("BookkeepingFrequency");
  const tDeliverableStatus = await getTranslations("DeliverableStatus");
  const tBookkeepingCaseStatus = await getTranslations("BookkeepingCaseStatus");
  const tImmigrationCaseStatus = await getTranslations("ImmigrationCaseStatus");
  const tCreditAccountType = await getTranslations("CreditAccountType");
  const tCreditCaseStatus = await getTranslations("CreditCaseStatus");
  const tConsultingCaseStatus = await getTranslations("ConsultingCaseStatus");
  const tFormationType = await getTranslations("FormationType");
  const tFormationCaseStatus = await getTranslations("FormationCaseStatus");
  const tAcademyCaseStatus = await getTranslations("AcademyCaseStatus");
  const tHighlevelSyncStatus = await getTranslations("HighlevelSyncStatus");
  const tProjectType = await getTranslations("ProjectType");
  const tMarketingCaseStatus = await getTranslations("MarketingCaseStatus");
  const tSalesTaxCaseStatus = await getTranslations("SalesTaxCaseStatus");
  const tSalesTaxFilingFrequency = await getTranslations("SalesTaxFilingFrequency");
  const tIrsCaseType = await getTranslations("IrsCaseType");
  const tIrsEinStatus = await getTranslations("IrsEinStatus");
  const tIrsItinStatus = await getTranslations("IrsItinStatus");
  const tIrsApplicationStatus = await getTranslations("IrsApplicationStatus");

  const result = await getCaseById(id);
  if (!result) notFound();

  const {
    case: c,
    client,
    notaryEntries,
    apostille,
    notaryDetails,
    taxDetails,
    bookkeepingDetails,
    immigrationDetails,
    creditDetails,
    consultingDetails,
    formationDetails,
    academyDetails,
    marketingDetails,
    salesTaxDetails,
    salesTaxCompany,
    irsDetails,
    irsCompany,
    documents,
    statusHistory,
  } = result;

  // Phase 4, Session 6 — "When service status changes: prepare optional
  // message template; do not send automatically" (spec #10). Surfaced as a
  // suggestion staff can act on, not an automatic send.
  const suggestedTemplate = await findActiveTemplate(
    "service_update",
    client.preferredLanguage as "en" | "es",
  );

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link href="/cases" className="text-sm text-muted-foreground underline">
          &larr; {t("backToCases")}
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={<a href={`/api/cases/${id}/template/pdf`} />}
          >
            <FileText className="h-4 w-4" />
            {t("generateTemplate")}
          </Button>
          <Button variant="outline" render={<Link href={`/cases/${id}/edit`} />}>
            <Pencil className="h-4 w-4" />
            {t("editCase")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl text-foreground">{c.title}</h1>
          <CaseStatusBadge status={c.status} />
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("columnClient")}</p>
            <Link
              href={`/clients/${client.id}`}
              className="text-foreground hover:underline"
            >
              {client.fullName}
            </Link>
          </div>
          <div>
            <p className="text-muted-foreground">{t("columnService")}</p>
            <p className="text-foreground">{tService(c.serviceType)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("columnDue")}</p>
            <p className="text-foreground">
              {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("columnFee")}</p>
            <p className="text-foreground">
              {c.fee ? `$${Number(c.fee).toFixed(2)}` : "—"}
            </p>
          </div>
        </div>
        {c.notes && (
          <div className="text-sm">
            <p className="text-muted-foreground">{t("form.notes")}</p>
            <p className="text-foreground">{c.notes}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">
          {t("trackingDetails")}
        </h2>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("form.startDate")}</p>
            <p className="text-foreground">
              {new Date(c.startDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {t("form.nextFollowUpDate")}
            </p>
            <p className="text-foreground">
              {c.nextFollowUpDate
                ? new Date(c.nextFollowUpDate).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.paymentStatus")}</p>
            <p className="text-foreground">
              {c.paymentStatus ? tPaymentStatus(c.paymentStatus) : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.referralSource")}</p>
            <p className="text-foreground">{c.referralSource ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {t("form.documentsRequested")}
            </p>
            <p className="text-foreground">{c.documentsRequested ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {t("form.documentsReceived")}
            </p>
            <p className="text-foreground">{c.documentsReceived ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.nextAction")}</p>
            <p className="text-foreground">{c.nextAction ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("closedDate")}</p>
            <p className="text-foreground">
              {c.closedDate
                ? new Date(c.closedDate).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {notaryEntries.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-lg text-foreground">
            {t("notaryJournal")}
          </h2>
          {notaryEntries.map((entry) => (
            <div
              key={entry.id}
              className="grid gap-3 border-t border-border pt-3 text-sm first:border-t-0 first:pt-0 sm:grid-cols-4"
            >
              <div>
                <p className="text-muted-foreground">{t("form.dueDate")}</p>
                <p className="text-foreground">
                  {new Date(entry.entryDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t("form.documentType")}
                </p>
                <p className="text-foreground">{entry.documentType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t("form.notarialActType")}
                </p>
                <p className="text-foreground">
                  {tActType(entry.notarialActType)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t("form.idVerificationMethod")}
                </p>
                <p className="text-foreground">
                  {tIdMethod(entry.idVerificationMethod)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {apostille && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-lg text-foreground">
            {t("apostilleDetails")}
          </h2>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">
                {t("form.destinationCountry")}
              </p>
              <p className="text-foreground">{apostille.destinationCountry}</p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.instrumentType")}
              </p>
              <p className="text-foreground">{apostille.instrumentType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.submissionDate")}
              </p>
              <p className="text-foreground">
                {apostille.submissionDate
                  ? new Date(apostille.submissionDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.expectedReturnDate")}
              </p>
              <p className="text-foreground">
                {apostille.expectedReturnDate
                  ? new Date(apostille.expectedReturnDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.actualReturnDate")}
              </p>
              <p className="text-foreground">
                {apostille.actualReturnDate
                  ? new Date(apostille.actualReturnDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {notaryDetails && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg text-foreground">
              {t("notaryServiceDetails")}
            </h2>
            <Badge variant="outline">
              {tNotaryCaseStatus(notaryDetails.status)}
            </Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">{t("form.modality")}</p>
              <p className="text-foreground">
                {tNotaryModality(notaryDetails.modality)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.appointmentDate")}
              </p>
              <p className="text-foreground">
                {notaryDetails.appointmentDate
                  ? new Date(notaryDetails.appointmentDate).toLocaleDateString()
                  : "—"}
                {notaryDetails.appointmentTime
                  ? ` ${notaryDetails.appointmentTime}`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.location")}</p>
              <p className="text-foreground">
                {notaryDetails.location ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.idVerificationStatus")}
              </p>
              <p className="text-foreground">
                {notaryDetails.idVerificationStatus
                  ? tIdVerificationStatus(notaryDetails.idVerificationStatus)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.numberOfSigners")}
              </p>
              <p className="text-foreground">
                {notaryDetails.numberOfSigners ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.numberOfDocuments")}
              </p>
              <p className="text-foreground">
                {notaryDetails.numberOfDocuments ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.numberOfNotarialActs")}
              </p>
              <p className="text-foreground">
                {notaryDetails.numberOfNotarialActs ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.loanSigningCompany")}
              </p>
              <p className="text-foreground">
                {notaryDetails.loanSigningCompany ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.titleCompany")}</p>
              <p className="text-foreground">
                {notaryDetails.titleCompany ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.trackingNumber")}
              </p>
              <p className="text-foreground">
                {notaryDetails.trackingNumber ?? "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {taxDetails && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg text-foreground">
              {t("taxServiceDetails")}
            </h2>
            <Badge variant="outline">{tTaxCaseStatus(taxDetails.status)}</Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">{t("form.taxYear")}</p>
              <p className="text-foreground">{taxDetails.taxYear}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.filerType")}</p>
              <p className="text-foreground">
                {tTaxFilerType(taxDetails.filerType)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.jurisdiction")}</p>
              <p className="text-foreground">
                {tTaxJurisdiction(taxDetails.jurisdiction)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.returnType")}</p>
              <p className="text-foreground">{taxDetails.returnType ?? "—"}</p>
            </div>
            {taxDetails.filingStatus && (
              <div>
                <p className="text-muted-foreground">
                  {t("form.filingStatus")}
                </p>
                <p className="text-foreground">
                  {tTaxFilingStatus(taxDetails.filingStatus)}
                </p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">
                {t("form.intakeCompleted")}
              </p>
              <p className="text-foreground">
                {taxDetails.intakeCompleted ? "✓" : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.efileAuthorizationSigned")}
              </p>
              <p className="text-foreground">
                {taxDetails.efileAuthorizationSigned ? "✓" : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.refundAmount")}
              </p>
              <p className="text-foreground">
                {taxDetails.refundAmount
                  ? `$${Number(taxDetails.refundAmount).toFixed(2)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.balanceDueAmount")}
              </p>
              <p className="text-foreground">
                {taxDetails.balanceDueAmount
                  ? `$${Number(taxDetails.balanceDueAmount).toFixed(2)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.taxAmountPaid")}
              </p>
              <p className="text-foreground">
                ${Number(taxDetails.amountPaid).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.balanceRemaining")}
              </p>
              <p className="text-foreground">
                $
                {(
                  Number(c.fee ?? 0) - Number(taxDetails.amountPaid)
                ).toFixed(2)}
              </p>
            </div>
          </div>
          {taxDetails.internalNotes && (
            <div className="text-sm">
              <p className="text-muted-foreground">
                {t("form.internalNotes")}
              </p>
              <p className="text-foreground">{taxDetails.internalNotes}</p>
            </div>
          )}
        </div>
      )}

      {bookkeepingDetails && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg text-foreground">
              {t("bookkeepingServiceDetails")}
            </h2>
            <Badge variant="outline">
              {tBookkeepingCaseStatus(bookkeepingDetails.status)}
            </Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">{t("form.businessName")}</p>
              <p className="text-foreground">
                {bookkeepingDetails.businessName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.bookkeepingFrequency")}
              </p>
              <p className="text-foreground">
                {bookkeepingDetails.frequency
                  ? tBookkeepingFrequency(bookkeepingDetails.frequency)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.accountingSoftware")}
              </p>
              <p className="text-foreground">
                {bookkeepingDetails.accountingSoftware ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.monthlyRevenueRange")}
              </p>
              <p className="text-foreground">
                {bookkeepingDetails.monthlyRevenueRange ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.lastMonthReconciled")}
              </p>
              <p className="text-foreground">
                {bookkeepingDetails.lastMonthReconciled
                  ? new Date(
                      bookkeepingDetails.lastMonthReconciled,
                    ).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.nextBillingDate")}
              </p>
              <p className="text-foreground">
                {bookkeepingDetails.nextBillingDate
                  ? new Date(
                      bookkeepingDetails.nextBillingDate,
                    ).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.profitLossStatus")}
              </p>
              <p className="text-foreground">
                {bookkeepingDetails.profitLossStatus
                  ? tDeliverableStatus(bookkeepingDetails.profitLossStatus)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.balanceSheetStatus")}
              </p>
              <p className="text-foreground">
                {bookkeepingDetails.balanceSheetStatus
                  ? tDeliverableStatus(bookkeepingDetails.balanceSheetStatus)
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {immigrationDetails && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {t("immigrationDisclaimer")}
          </p>
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg text-foreground">
              {t("immigrationServiceDetails")}
            </h2>
            <Badge variant="outline">
              {tImmigrationCaseStatus(immigrationDetails.status)}
            </Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">
                {t("form.administrativeServiceType")}
              </p>
              <p className="text-foreground">
                {immigrationDetails.administrativeServiceType ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.formNumber")}</p>
              <p className="text-foreground">
                {immigrationDetails.formNumber ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.language")}</p>
              <p className="text-foreground">
                {immigrationDetails.language ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.translationStatus")}
              </p>
              <p className="text-foreground">
                {immigrationDetails.translationNeeded
                  ? immigrationDetails.translationStatus
                    ? tDeliverableStatus(immigrationDetails.translationStatus)
                    : "—"
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.attorneyReferralNeeded")}
              </p>
              <p className="text-foreground">
                {immigrationDetails.attorneyReferralNeeded ? "✓" : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.governmentFilingFee")}
              </p>
              <p className="text-foreground">
                {immigrationDetails.governmentFilingFee
                  ? `$${Number(immigrationDetails.governmentFilingFee).toFixed(2)}`
                  : "—"}
              </p>
            </div>
          </div>
          {immigrationDetails.clientProvidedInstructions && (
            <div className="text-sm">
              <p className="text-muted-foreground">
                {t("form.clientProvidedInstructions")}
              </p>
              <p className="text-foreground">
                {immigrationDetails.clientProvidedInstructions}
              </p>
            </div>
          )}
        </div>
      )}

      {creditDetails && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {t("creditDisclaimer")}
          </p>
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg text-foreground">
              {t("creditServiceDetails")}
            </h2>
            <Badge variant="outline">
              {tCreditCaseStatus(creditDetails.status)}
            </Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">
                {t("form.creditServiceType")}
              </p>
              <p className="text-foreground">
                {creditDetails.creditServiceType ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.accountType")}</p>
              <p className="text-foreground">
                {creditDetails.accountType
                  ? tCreditAccountType(creditDetails.accountType)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.initialConsultationDate")}
              </p>
              <p className="text-foreground">
                {creditDetails.initialConsultationDate
                  ? new Date(
                      creditDetails.initialConsultationDate,
                    ).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.creditReportReviewDate")}
              </p>
              <p className="text-foreground">
                {creditDetails.creditReportReviewDate
                  ? new Date(
                      creditDetails.creditReportReviewDate,
                    ).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.creditEducationCompleted")}
              </p>
              <p className="text-foreground">
                {creditDetails.creditEducationCompleted ? "✓" : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.mainClientGoal")}
              </p>
              <p className="text-foreground">
                {creditDetails.mainClientGoal ?? "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {consultingDetails && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg text-foreground">
              {t("consultingServiceDetails")}
            </h2>
            <Badge variant="outline">
              {tConsultingCaseStatus(consultingDetails.status)}
            </Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">
                {t("form.businessStage")}
              </p>
              <p className="text-foreground">
                {consultingDetails.businessStage ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.consultingPackage")}
              </p>
              <p className="text-foreground">
                {consultingDetails.consultingPackage ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.numberOfSessions")}
              </p>
              <p className="text-foreground">
                {consultingDetails.sessionsCompleted ?? 0} /{" "}
                {consultingDetails.numberOfSessions ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.completionPercentage")}
              </p>
              <p className="text-foreground">
                {consultingDetails.completionPercentage != null
                  ? `${consultingDetails.completionPercentage}%`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.goal30Day")}</p>
              <p className="text-foreground">
                {consultingDetails.goal30Day ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.goal90Day")}</p>
              <p className="text-foreground">
                {consultingDetails.goal90Day ?? "—"}
              </p>
            </div>
          </div>
          {consultingDetails.businessProblem && (
            <div className="text-sm">
              <p className="text-muted-foreground">
                {t("form.businessProblem")}
              </p>
              <p className="text-foreground">
                {consultingDetails.businessProblem}
              </p>
            </div>
          )}
          {consultingDetails.diagnosisSummary && (
            <div className="text-sm">
              <p className="text-muted-foreground">
                {t("form.diagnosisSummary")}
              </p>
              <p className="text-foreground">
                {consultingDetails.diagnosisSummary}
              </p>
            </div>
          )}
          {consultingDetails.actionPlan && (
            <div className="text-sm">
              <p className="text-muted-foreground">{t("form.actionPlan")}</p>
              <p className="text-foreground">{consultingDetails.actionPlan}</p>
            </div>
          )}
        </div>
      )}

      {formationDetails && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg text-foreground">
              {t("businessFormationDetails")}
            </h2>
            <Badge variant="outline">
              {tFormationCaseStatus(formationDetails.status)}
            </Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">
                {t("form.formationBusinessName")}
              </p>
              <p className="text-foreground">
                {formationDetails.businessName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.formationType")}
              </p>
              <p className="text-foreground">
                {formationDetails.formationType
                  ? tFormationType(formationDetails.formationType)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.stateOfFormation")}
              </p>
              <p className="text-foreground">
                {formationDetails.stateOfFormation ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.registeredAgent")}
              </p>
              <p className="text-foreground">
                {formationDetails.registeredAgent ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.stateFilingDate")}
              </p>
              <p className="text-foreground">
                {formationDetails.stateFilingDate
                  ? new Date(formationDetails.stateFilingDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.stateApprovalDate")}
              </p>
              <p className="text-foreground">
                {formationDetails.stateApprovalDate
                  ? new Date(
                      formationDetails.stateApprovalDate,
                    ).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.documentDeliveryStatus")}
              </p>
              <p className="text-foreground">
                {formationDetails.documentDeliveryStatus
                  ? tDeliverableStatus(formationDetails.documentDeliveryStatus)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.governmentFee")}
              </p>
              <p className="text-foreground">
                {formationDetails.governmentFee
                  ? `$${Number(formationDetails.governmentFee).toFixed(2)}`
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {academyDetails && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg text-foreground">
              {t("academyEnrollmentDetails")}
            </h2>
            <Badge variant="outline">
              {tAcademyCaseStatus(academyDetails.status)}
            </Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">{t("form.program")}</p>
              <p className="text-foreground">
                {academyDetails.program ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.course")}</p>
              <p className="text-foreground">
                {academyDetails.course ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.enrollmentDate")}
              </p>
              <p className="text-foreground">
                {academyDetails.enrollmentDate
                  ? new Date(academyDetails.enrollmentDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.progressPercentage")}
              </p>
              <p className="text-foreground">
                {academyDetails.progressPercentage != null
                  ? `${academyDetails.progressPercentage}%`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.modulesCompleted")}
              </p>
              <p className="text-foreground">
                {academyDetails.modulesCompleted ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.attendancePercentage")}
              </p>
              <p className="text-foreground">
                {academyDetails.attendancePercentage != null
                  ? `${academyDetails.attendancePercentage}%`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.assignmentsCompleted")}
              </p>
              <p className="text-foreground">
                {academyDetails.assignmentsCompleted ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.certificateDate")}
              </p>
              <p className="text-foreground">
                {academyDetails.certificateDate
                  ? new Date(academyDetails.certificateDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.communityAccess")}
              </p>
              <p className="text-foreground">
                {academyDetails.communityAccess ? "✓" : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.highlevelSyncStatus")}
              </p>
              <p className="text-foreground">
                {tHighlevelSyncStatus(academyDetails.highlevelSyncStatus)}
              </p>
            </div>
          </div>
          {academyDetails.finalEvaluation && (
            <div className="text-sm">
              <p className="text-muted-foreground">
                {t("form.finalEvaluation")}
              </p>
              <p className="text-foreground">
                {academyDetails.finalEvaluation}
              </p>
            </div>
          )}
        </div>
      )}

      {marketingDetails && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg text-foreground">
              {t("marketingProjectDetails")}
            </h2>
            <Badge variant="outline">
              {tMarketingCaseStatus(marketingDetails.status)}
            </Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">{t("form.projectType")}</p>
              <p className="text-foreground">
                {marketingDetails.projectType
                  ? tProjectType(marketingDetails.projectType)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.completionPercentage")}
              </p>
              <p className="text-foreground">
                {marketingDetails.completionPercentage != null
                  ? `${marketingDetails.completionPercentage}%`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.integrationsRequired")}
              </p>
              <p className="text-foreground">
                {marketingDetails.integrationsRequired ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.aiAgentRequired")}
              </p>
              <p className="text-foreground">
                {marketingDetails.aiAgentRequired ? "✓" : "—"}
              </p>
            </div>
          </div>
          {marketingDetails.businessGoal && (
            <div className="text-sm">
              <p className="text-muted-foreground">
                {t("form.businessGoal")}
              </p>
              <p className="text-foreground">
                {marketingDetails.businessGoal}
              </p>
            </div>
          )}
          {marketingDetails.deliverables && (
            <div className="text-sm">
              <p className="text-muted-foreground">
                {t("form.deliverables")}
              </p>
              <p className="text-foreground">
                {marketingDetails.deliverables}
              </p>
            </div>
          )}
        </div>
      )}

      {salesTaxDetails && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg text-foreground">
              {t("salesTaxCaseDetails")}
            </h2>
            <Badge variant="outline">
              {tSalesTaxCaseStatus(salesTaxDetails.status)}
            </Badge>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">{t("form.company")}</p>
              <p className="text-foreground">
                {salesTaxCompany?.legalBusinessName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.salesTaxState")}</p>
              <p className="text-foreground">{salesTaxDetails.state}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.stateTaxAgency")}</p>
              <p className="text-foreground">
                {salesTaxDetails.stateTaxAgency ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.salesTaxAccountNumber")}
              </p>
              <p className="text-foreground">
                {salesTaxDetails.salesTaxAccountNumber ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.registrationDate")}</p>
              <p className="text-foreground">
                {salesTaxDetails.registrationDate
                  ? new Date(salesTaxDetails.registrationDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.filingFrequency")}</p>
              <p className="text-foreground">
                {salesTaxDetails.filingFrequency
                  ? tSalesTaxFilingFrequency(salesTaxDetails.filingFrequency)
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.nextFilingDueDate")}
              </p>
              <p className="text-foreground">
                {salesTaxDetails.nextFilingDueDate
                  ? new Date(salesTaxDetails.nextFilingDueDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.lastFiledPeriod")}</p>
              <p className="text-foreground">
                {salesTaxDetails.lastFiledPeriod ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.amountDue")}</p>
              <p className="text-foreground">
                {salesTaxDetails.amountDue
                  ? `$${Number(salesTaxDetails.amountDue).toFixed(2)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.amountPaid")}</p>
              <p className="text-foreground">
                {salesTaxDetails.amountPaid
                  ? `$${Number(salesTaxDetails.amountPaid).toFixed(2)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.accountStatus")}</p>
              <p className="text-foreground">
                {salesTaxDetails.accountStatus ?? "—"}
              </p>
            </div>
            {salesTaxDetails.registrationPortalUrl && (
              <div>
                <p className="text-muted-foreground">
                  {t("form.registrationPortalUrl")}
                </p>
                <a
                  href={salesTaxDetails.registrationPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline"
                >
                  {t("form.registrationPortalUrl")}
                </a>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("form.salesTaxDisclaimer")}
          </p>
        </div>
      )}

      {irsDetails && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg text-foreground">
              {t("irsCaseDetails")}
            </h2>
            <Badge variant="outline">{tIrsCaseType(irsDetails.caseType)}</Badge>
            {irsDetails.caseType === "ein_assistance" && irsDetails.einStatus && (
              <Badge variant="outline">{tIrsEinStatus(irsDetails.einStatus)}</Badge>
            )}
            {irsDetails.caseType === "itin_assistance" && irsDetails.itinStatus && (
              <Badge variant="outline">{tIrsItinStatus(irsDetails.itinStatus)}</Badge>
            )}
            {irsDetails.caseType !== "ein_assistance" &&
              irsDetails.caseType !== "itin_assistance" &&
              irsDetails.applicationStatus && (
                <Badge variant="outline">
                  {tIrsApplicationStatus(irsDetails.applicationStatus)}
                </Badge>
              )}
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">{t("form.company")}</p>
              <p className="text-foreground">
                {irsCompany?.legalBusinessName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.taxpayerName")}</p>
              <p className="text-foreground">{irsDetails.taxpayerName ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.responsibleParty")}
              </p>
              <p className="text-foreground">
                {irsDetails.responsibleParty ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.irsState")}</p>
              <p className="text-foreground">{irsDetails.state ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.submissionMethod")}
              </p>
              <p className="text-foreground">
                {irsDetails.submissionMethod ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.submissionDate")}</p>
              <p className="text-foreground">
                {irsDetails.submissionDate
                  ? new Date(irsDetails.submissionDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.irsReferenceNumber")}
              </p>
              <p className="text-foreground">
                {irsDetails.irsReferenceNumber ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.irsLetterReceived")}</p>
              <p className="text-foreground">
                {irsDetails.irsLetterReceived
                  ? irsDetails.irsLetterDate
                    ? new Date(irsDetails.irsLetterDate).toLocaleDateString()
                    : "✓"
                  : "—"}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("form.irsDisclaimer")}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">
          {tDocuments("title")}
        </h2>
        {isBlobConfigured() ? (
          <DocumentUploader
            clientId={client.id}
            caseId={c.id}
            showFolderSelect={c.serviceType === "immigration"}
          />
        ) : (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {tDocuments("notConfigured")}
          </p>
        )}
        <DocumentList
          documents={documents}
          groupByFolder={c.serviceType === "immigration"}
        />
      </div>

      {statusHistory.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-lg text-foreground">
            {t("statusHistory")}
          </h2>
          <div className="flex flex-col gap-2">
            {statusHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center gap-2 border-t border-border pt-2 text-sm first:border-t-0 first:pt-0"
              >
                {entry.previousStatus && (
                  <>
                    <CaseStatusBadge status={entry.previousStatus} />
                    <span className="text-muted-foreground">→</span>
                  </>
                )}
                <CaseStatusBadge status={entry.newStatus} />
                <span className="text-muted-foreground">
                  {new Date(entry.changedAt).toLocaleString()}
                </span>
                {entry.changedByEmail && (
                  <Badge variant="outline">{entry.changedByEmail}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {suggestedTemplate && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg text-foreground">
              {t("suggestedTemplateTitle")}
            </h2>
            <Badge variant="outline">{suggestedTemplate.name}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("suggestedTemplateNote")}
          </p>
          <p className="whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm text-foreground">
            {suggestedTemplate.messageBody}
          </p>
          <div>
            <Button
              size="sm"
              variant="outline"
              render={
                <Link
                  href={`/communications/new?clientId=${client.id}&caseId=${id}&templateId=${suggestedTemplate.id}`}
                />
              }
            >
              {t("useSuggestedTemplate")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
