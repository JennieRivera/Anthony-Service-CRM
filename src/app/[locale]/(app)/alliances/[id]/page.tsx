import { formatDate, formatDateTime } from "@/lib/dates";
import { notFound } from "next/navigation";
import { Pencil, Download, Calendar } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAllianceById } from "@/lib/queries/alliances";
import { listClientsForSelect } from "@/lib/queries/clients";
import { isBlobConfigured } from "@/lib/blob/config";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AllianceStatusBadge } from "@/components/alliances/AllianceStatusBadge";
import { AllianceDocumentUploader } from "@/components/alliances/AllianceDocumentUploader";
import { AllianceDocumentTypeSelect } from "@/components/alliances/AllianceDocumentTypeSelect";
import { AllianceContactsSection } from "@/components/alliances/AllianceContactsSection";
import {
  createAllianceContactAction,
  deleteAllianceContactAction,
} from "../actions";

export default async function AllianceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Alliances");
  const tOrgType = await getTranslations("OrganizationType");
  const tChannel = await getTranslations("ConversationChannel");
  const tAppointmentStatus = await getTranslations("AppointmentStatus");
  const blobConfigured = isBlobConfigured();

  const [result, clients] = await Promise.all([
    getAllianceById(id),
    listClientsForSelect(),
  ]);
  if (!result) notFound();

  const {
    alliance,
    statusHistory,
    linkedReferrals,
    documents,
    linkedClient,
    linkedCompany,
    contacts,
    communications,
    linkedAppointments,
  } = result;
  const contractSigned = alliance.referralAgreement || alliance.commissionAgreement;

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/community"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToAlliances")}
        </Link>
        <Button render={<Link href={`/alliances/${id}/edit`} />}>
          <Pencil className="h-4 w-4" />
          {t("editAlliance")}
        </Button>
      </div>

      {/* Alliance information */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-2xl text-foreground">
            {alliance.organizationName}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={contractSigned ? "default" : "destructive"}>
              {t("contractStatus")}: {contractSigned ? t("signed") : t("pending")}
            </Badge>
            <AllianceStatusBadge status={alliance.status} />
          </div>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">
              {t("form.organizationType")}
            </p>
            <p className="text-foreground">
              {alliance.organizationType
                ? tOrgType(alliance.organizationType)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.contactPerson")}</p>
            <p className="text-foreground">
              {alliance.contactPerson ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.phone")}</p>
            <p className="text-foreground">{alliance.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.email")}</p>
            <p className="text-foreground">{alliance.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.website")}</p>
            <p className="text-foreground">{alliance.website ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.city")}</p>
            <p className="text-foreground">{alliance.city ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.state")}</p>
            <p className="text-foreground">{alliance.state ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {t("form.relationshipOwner")}
            </p>
            <p className="text-foreground">
              {alliance.relationshipOwner ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {t("form.dateIntroduced")}
            </p>
            <p className="text-foreground">
              {alliance.dateIntroduced
                ? formatDate(alliance.dateIntroduced)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {t("form.servicesConnected")}
            </p>
            <p className="text-foreground">
              {alliance.servicesConnected ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.lastContact")}</p>
            <p className="text-foreground">
              {alliance.lastContact
                ? formatDate(alliance.lastContact)
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.nextFollowUp")}</p>
            <p className="text-foreground">
              {alliance.nextFollowUp
                ? formatDate(alliance.nextFollowUp)
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Organization/company */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">
          {t("sections.organization")}
        </h2>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">{t("form.linkedCompany")}</p>
            <p className="text-foreground">
              {linkedCompany ? (
                <Link href={`/companies/${linkedCompany.id}`} className="hover:underline">
                  {linkedCompany.legalBusinessName}
                </Link>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.linkedClient")}</p>
            <p className="text-foreground">
              {linkedClient ? (
                <Link href={`/clients/${linkedClient.id}`} className="hover:underline">
                  {linkedClient.fullName}
                </Link>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Contacts */}
      <AllianceContactsSection
        allianceId={id}
        contacts={contacts}
        clients={clients}
        onCreate={createAllianceContactAction}
        onDelete={deleteAllianceContactAction}
      />

      {/* Agreement dates */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">
          {t("sections.agreementDates")}
        </h2>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">{t("form.agreementStartDate")}</p>
            <p className="text-foreground">
              {alliance.agreementStartDate ? formatDate(alliance.agreementStartDate) : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.agreementRenewalDate")}</p>
            <p className="text-foreground">
              {alliance.agreementRenewalDate ? formatDate(alliance.agreementRenewalDate) : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("contractStatus")}</p>
            <p className="text-foreground">{contractSigned ? t("signed") : t("pending")}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("form.referralAgreement")}</p>
            <p className="text-foreground">{alliance.referralAgreement ? "✓" : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.commissionAgreement")}</p>
            <p className="text-foreground">{alliance.commissionAgreement ? "✓" : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.marketingPermission")}</p>
            <p className="text-foreground">{alliance.marketingPermission ? "✓" : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.logoPermission")}</p>
            <p className="text-foreground">{alliance.logoPermission ? "✓" : "—"}</p>
          </div>
        </div>
      </div>

      {/* Responsibilities */}
      {(alliance.amsResponsibilities || alliance.partnerResponsibilities) && (
        <div className="grid gap-3 rounded-lg border border-border bg-card p-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">{t("form.amsResponsibilities")}</p>
            <p className="whitespace-pre-wrap text-foreground">
              {alliance.amsResponsibilities ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.partnerResponsibilities")}</p>
            <p className="whitespace-pre-wrap text-foreground">
              {alliance.partnerResponsibilities ?? "—"}
            </p>
          </div>
        </div>
      )}

      {/* Notes */}
      {alliance.notes && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm">
          <p className="text-muted-foreground">{t("form.notes")}</p>
          <p className="text-foreground whitespace-pre-wrap">
            {alliance.notes}
          </p>
        </div>
      )}

      {/* Referrals */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">
          {t("linkedReferrals")}
        </h2>
        {linkedReferrals.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noLinkedReferrals")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {linkedReferrals.map((referral) => (
              <li
                key={referral.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <Link
                  href={`/referrals/${referral.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  R-{String(referral.referralSeq).padStart(3, "0")} — {referral.clientName}
                </Link>
                <span className="text-muted-foreground">
                  {t("commission")}:{" "}
                  {referral.commissionPercentage
                    ? `${referral.commissionPercentage}%`
                    : "—"}
                  {referral.commissionDue ? ` ($${referral.commissionDue})` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Communications */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">
          {t("sections.communications")}
        </h2>
        {communications.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noCommunications")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {communications.map((comm) => (
              <li
                key={comm.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <Link
                  href={`/communications/${comm.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  COM-{String(comm.communicationSeq).padStart(5, "0")} —{" "}
                  {comm.subject || tChannel(comm.channel)}
                </Link>
                <span className="text-muted-foreground">
                  {formatDateTime(comm.occurredAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Appointments */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">
          {t("sections.appointments")}
        </h2>
        {linkedAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noAppointments")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {linkedAppointments.map((appt) => (
              <li
                key={appt.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <Link
                  href={`/appointments/${appt.id}`}
                  className="flex items-center gap-2 font-medium text-foreground hover:underline"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {appt.title} — {appt.clientName}
                </Link>
                <span className="text-muted-foreground">
                  {formatDateTime(appt.startAt)} · {tAppointmentStatus(appt.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Contracts/documents */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">
          {t("documentsTitle")}
        </h2>
        {blobConfigured && <AllianceDocumentUploader allianceId={id} />}
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("documents.empty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {documents.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="truncate font-medium text-foreground">{doc.fileName}</span>
                <div className="flex items-center gap-2">
                  <AllianceDocumentTypeSelect allianceId={id} document={doc} />
                  <Button
                    variant="outline"
                    size="sm"
                    render={<a href={`/api/alliance-documents/${doc.id}/file?download=1`} />}
                  >
                    <Download className="h-4 w-4" />
                    {t("documents.download")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Relationship/status history */}
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
                    <AllianceStatusBadge status={entry.previousStatus} />
                    <span className="text-muted-foreground">→</span>
                  </>
                )}
                <AllianceStatusBadge status={entry.newStatus} />
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
