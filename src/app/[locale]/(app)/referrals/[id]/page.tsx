import { formatDate, formatDateTime } from "@/lib/dates";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getReferralById } from "@/lib/queries/referrals";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReferralStatusBadge } from "@/components/referrals/ReferralStatusBadge";
import { ReferralPipelineStatusBadge } from "@/components/referrals/ReferralPipelineStatusBadge";
import { ReferralCompensationSection } from "@/components/referrals/ReferralCompensationSection";
import AccessDenied from "@/components/AccessDenied";
import { getCurrentRole, hasAccessArea, hasReferralViewAccess } from "@/lib/permissions";
import { FinanceLegalNotice } from "@/components/legal/FinanceLegalNotice";
import {
  setCompensationTermsAction,
  markCompensationEarnedAction,
  approveCompensationAction,
  recordCompensationPaymentAction,
  reverseCompensationPaymentAction,
} from "../actions";

export default async function ReferralDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Referrals");
  const tCategory = await getTranslations("ReferralCategory");
  const tDirection = await getTranslations("ReferralDirection");

  const role = await getCurrentRole();
  if (!role || !hasReferralViewAccess(role)) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <AccessDenied />
      </div>
    );
  }
  // RBAC correction — three independently least-privileged compensation
  // permissions (see the AccessArea comment block in permissions.ts) plus
  // "referrals" itself, which still gates editing the referral record.
  const canEditReferral = hasAccessArea(role, "referrals");
  const canEditCompensationTerms = hasAccessArea(role, "referral_compensation_terms");
  const canApproveCompensation = hasAccessArea(role, "referral_compensation_approval");
  const canRecordCompensationPayment = hasAccessArea(role, "referral_compensation_payment");

  const result = await getReferralById(id);
  if (!result) notFound();

  const { referral, client, caseTitle, allianceName, referrerClient, rriDetails, statusHistory, compensation } = result;
  const referralNumber = `REF-${String(referral.referralSeq).padStart(5, "0")}`;

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/referrals"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToReferrals")}
        </Link>
        {canEditReferral && (
          <Button render={<Link href={`/referrals/${id}/edit`} />}>
            <Pencil className="h-4 w-4" />
            {t("editReferral")}
          </Button>
        )}
      </div>

      {referral.category === "commercial_finance" && <FinanceLegalNotice />}

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl text-foreground">
              {referralNumber}
            </h1>
            <Badge variant="outline">{tCategory(referral.category)}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <ReferralPipelineStatusBadge status={referral.pipelineStatus} />
            <ReferralStatusBadge status={referral.status} />
          </div>
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
            <p className="text-muted-foreground">{t("columnDate")}</p>
            <p className="text-foreground">
              {formatDate(referral.referralDate)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.direction")}</p>
            <p className="text-foreground">
              {referral.direction ? tDirection(referral.direction) : "—"}
            </p>
          </div>
          {caseTitle && (
            <div>
              <p className="text-muted-foreground">{t("form.case")}</p>
              <p className="text-foreground">{caseTitle}</p>
            </div>
          )}
          {referral.closedDate && (
            <div>
              <p className="text-muted-foreground">{t("form.closedDate")}</p>
              <p className="text-foreground">
                {formatDate(referral.closedDate)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-6 text-sm sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground">{t("referrerType")}</p>
          <p className="text-foreground">
            {allianceName ? (
              <>
                {t("referrerTypeAlliance")}:{" "}
                <Link href={`/alliances/${referral.allianceId}`} className="hover:underline">
                  {allianceName}
                </Link>
              </>
            ) : referrerClient ? (
              <>
                {t("referrerTypeClient")}:{" "}
                <Link href={`/clients/${referrerClient.id}`} className="hover:underline">
                  {referrerClient.fullName}
                </Link>
              </>
            ) : (
              t("referrerTypeOther")
            )}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">
            {t("form.originatingBusiness")}
          </p>
          <p className="text-foreground">
            {referral.originatingBusiness ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("form.referredBy")}</p>
          <p className="text-foreground">{referral.referredBy}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("form.receivingParty")}</p>
          <p className="text-foreground">{referral.receivingParty}</p>
        </div>
      </div>

      {(referral.grossRevenue ||
        referral.commissionPercentage ||
        referral.commissionDue ||
        referral.paymentMethod ||
        referral.paymentConfirmation) && (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">{t("legacyCommissionFields")}</h2>
        <p className="text-xs text-muted-foreground">{t("legacyCommissionFieldsHint")}</p>
        <div className="grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">{t("form.grossRevenue")}</p>
          <p className="text-foreground">
            {referral.grossRevenue
              ? `$${Number(referral.grossRevenue).toFixed(2)}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">
            {t("form.allowedDeductions")}
          </p>
          <p className="text-foreground">
            {referral.allowedDeductions
              ? `$${Number(referral.allowedDeductions).toFixed(2)}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("netServiceRevenue")}</p>
          <p className="text-foreground">
            {referral.netServiceRevenue
              ? `$${Number(referral.netServiceRevenue).toFixed(2)}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">
            {t("form.commissionPercentage")}
          </p>
          <p className="text-foreground">
            {referral.commissionPercentage
              ? `${Number(referral.commissionPercentage).toFixed(2)}%`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("commissionDue")}</p>
          <p className="text-lg font-medium text-foreground">
            {referral.commissionDue
              ? `$${Number(referral.commissionDue).toFixed(2)}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">
            {t("form.commissionDueDate")}
          </p>
          <p className="text-foreground">
            {referral.commissionDueDate
              ? formatDate(referral.commissionDueDate)
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">
            {t("form.commissionPaidDate")}
          </p>
          <p className="text-foreground">
            {referral.commissionPaidDate
              ? formatDate(referral.commissionPaidDate)
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("form.paymentMethod")}</p>
          <p className="text-foreground">{referral.paymentMethod ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">
            {t("form.paymentConfirmation")}
          </p>
          <p className="text-foreground">
            {referral.paymentConfirmation ?? "—"}
          </p>
        </div>
        </div>
      </div>
      )}

      <ReferralCompensationSection
        referralId={id}
        compensation={compensation?.compensation ?? null}
        payments={compensation?.payments ?? []}
        canEditTerms={canEditCompensationTerms}
        canApprove={canApproveCompensation}
        canRecordPayment={canRecordCompensationPayment}
        onSetTerms={setCompensationTermsAction}
        onMarkEarned={markCompensationEarnedAction}
        onApprove={approveCompensationAction}
        onRecordPayment={recordCompensationPaymentAction}
        onReversePayment={reverseCompensationPaymentAction}
      />

      {referral.notes && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm">
          <p className="text-muted-foreground">{t("form.notes")}</p>
          <p className="text-foreground whitespace-pre-wrap">
            {referral.notes}
          </p>
        </div>
      )}

      {rriDetails && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-3">
            <h2 className="font-heading text-lg text-foreground">
              {t("rriDetails")}
            </h2>
          </div>
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-muted-foreground">
                {t("form.rriBusinessName")}
              </p>
              <p className="text-foreground">
                {rriDetails.businessName ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.businessEntity")}
              </p>
              <p className="text-foreground">
                {rriDetails.businessEntity ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.industry")}</p>
              <p className="text-foreground">{rriDetails.industry ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.yearsInBusiness")}
              </p>
              <p className="text-foreground">
                {rriDetails.yearsInBusiness ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.amountRequested")}
              </p>
              <p className="text-foreground">
                {rriDetails.amountRequested
                  ? `$${Number(rriDetails.amountRequested).toFixed(2)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.financingType")}
              </p>
              <p className="text-foreground">
                {rriDetails.financingType ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.fundingPurpose")}
              </p>
              <p className="text-foreground">
                {rriDetails.fundingPurpose ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.consentToShareInformation")}
              </p>
              <p className="text-foreground">
                {rriDetails.consentToShareInformation ? "✓" : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

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
                    <ReferralStatusBadge status={entry.previousStatus} />
                    <span className="text-muted-foreground">→</span>
                  </>
                )}
                <ReferralStatusBadge status={entry.newStatus} />
                <span className="text-muted-foreground">
                  {formatDateTime(entry.changedAt)}
                </span>
                {entry.changedByEmail && (
                  <Badge variant="outline">{entry.changedByEmail}</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
