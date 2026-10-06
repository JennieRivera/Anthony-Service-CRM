import { formatDate, formatDateTime } from "@/lib/dates";
import { notFound } from "next/navigation";
import { Pencil, Download, Calendar } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAllianceById, listAlliancesForSelect } from "@/lib/queries/alliances";
import { listClientsForSelect } from "@/lib/queries/clients";
import { isBlobConfigured } from "@/lib/blob/config";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AllianceStatusBadge } from "@/components/alliances/AllianceStatusBadge";
import { AllianceDocumentUploader } from "@/components/alliances/AllianceDocumentUploader";
import { AllianceDocumentTypeSelect } from "@/components/alliances/AllianceDocumentTypeSelect";
import { AllianceContactsSection } from "@/components/alliances/AllianceContactsSection";
import { AllianceNetworkSection } from "@/components/alliances/AllianceNetworkSection";
import { AllianceActivitySection } from "@/components/alliances/AllianceActivitySection";
import { AllianceMembershipSection } from "@/components/alliances/AllianceMembershipSection";
import { PartnerAccessCard } from "@/components/alliances/PartnerAccessCard";
import { PartnerDocumentVisibility } from "@/components/alliances/PartnerDocumentVisibility";
import { getPartnerStaffView } from "@/lib/partners/staff";
import { AllianceDeleteButton } from "@/components/alliances/AllianceDeleteButton";
import { getAllianceDeletionImpact } from "@/lib/deletion";
import { getDb } from "@/lib/db";
import type { PortalDb } from "@/lib/portal/db";
import AccessDenied from "@/components/AccessDenied";
import { getCurrentRole, hasAccessArea, hasAllianceViewAccess } from "@/lib/permissions";
import { listActiveMembershipPlansForSelect, listActiveMembershipBenefitsForSelect } from "@/lib/queries/memberships";
import {
  createAllianceContactAction,
  deleteAllianceContactAction,
  createAllianceNetworkRelationshipAction,
  deleteAllianceNetworkRelationshipAction,
  assignMembershipAction,
  updateMembershipTermsAction,
  changeMembershipStatusAction,
  linkMembershipInvoiceAction,
  addMembershipBenefitOverrideAction,
  removeMembershipBenefitOverrideAction,
} from "../actions";
import { getBookingTitleLocalizer } from "@/lib/booking/titleLocalizer";

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
  const bookingTitle = await getBookingTitleLocalizer();

  const role = await getCurrentRole();
  if (!role || !hasAllianceViewAccess(role)) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <AccessDenied />
      </div>
    );
  }
  const canEditAlliance = hasAccessArea(role, "alliances");
  // Deleting an alliance is for super_admin/admin only.
  const deletionImpact =
    role === "super_admin" || role === "admin" ? await getAllianceDeletionImpact(getDb() as unknown as PortalDb, id) : null;
  const canManageMembership = hasAccessArea(role, "b2b_membership");
  const canLinkInvoice = hasAccessArea(role, "b2b_membership_billing");

  const blobConfigured = isBlobConfigured();

  const [result, clients, allAlliances, membershipPlans, membershipBenefits, partner] = await Promise.all([
    getAllianceById(id),
    listClientsForSelect(),
    listAlliancesForSelect(),
    listActiveMembershipPlansForSelect(),
    listActiveMembershipBenefitsForSelect(),
    getPartnerStaffView(id),
  ]);
  if (!result) notFound();
  const tPartner = await getTranslations("PartnerAccess");

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
    network,
    activity,
    membership,
    linkableInvoices,
  } = result;
  const contractSigned = alliance.referralAgreement || alliance.commissionAgreement;
  const otherAlliances = allAlliances.filter((a) => a.id !== id);

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/community"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToAlliances")}
        </Link>
        <div className="flex flex-wrap gap-2">
          {canEditAlliance && (
            <Button render={<Link href={`/alliances/${id}/edit`} />}>
              <Pencil className="h-4 w-4" />
              {t("editAlliance")}
            </Button>
          )}
          {deletionImpact && <AllianceDeleteButton allianceId={id} impact={deletionImpact} />}
        </div>
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

      {/* Partner portal (Phase A): access, and what the alliance added. */}
      <PartnerAccessCard
        allianceId={id}
        canEdit={canEditAlliance}
        hasPhone={(alliance.phone ?? "").replace(/\D/g, "").length >= 4}
        summary={{
          pendingLink: partner.access.pendingLink
            ? { expiresAt: partner.access.pendingLink.expiresAt.toISOString(), locked: partner.access.pendingLink.locked }
            : null,
          activeSessions: partner.access.activeSessions,
          lastSeenAt: partner.access.lastSeenAt ? new Date(partner.access.lastSeenAt).toISOString() : null,
          lastLoginAt: partner.access.lastLoginAt ? new Date(partner.access.lastLoginAt).toISOString() : null,
          termsAcceptedAt: partner.termsAcceptedAt ? partner.termsAcceptedAt.toISOString() : null,
        }}
      />

      {(partner.profile || partner.photos.length > 0 || partner.addedClients.length > 0) && (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-lg text-foreground">{tPartner("profileTitle")}</h2>
          <p className="text-sm text-muted-foreground">{tPartner("profileHint")}</p>
          {(partner.licenseStatus === "soon" ||
            partner.licenseStatus === "expired" ||
            partner.insuranceStatus === "soon" ||
            partner.insuranceStatus === "expired") && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
              {tPartner("expiryAlert")}
            </p>
          )}
          <div className="flex flex-wrap items-start gap-4">
            {partner.profile?.logoBlobUrl && (
              // Private logo, streamed after the staff auth() check.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/alliances/${id}/partner-file`} alt="" className="size-20 rounded-lg border border-border object-cover" />
            )}
            <dl className="grid min-w-0 flex-1 gap-3 text-sm sm:grid-cols-2 [&_dd]:wrap-anywhere [&_dd]:whitespace-pre-line">
              {(
                [
                  ["description", partner.profile?.description],
                  ["servicesOffered", partner.profile?.servicesOffered],
                  ["serviceArea", partner.profile?.serviceArea],
                  ["socialLinks", partner.profile?.socialLinks],
                  ["license", partner.profile?.licenseNumber ? `${partner.profile.licenseNumber}${partner.profile.licenseExpiration ? ` · ${formatDate(partner.profile.licenseExpiration)}` : ""}` : null],
                  ["insurance", partner.profile?.insuranceProvider || partner.profile?.insuranceExpiration ? `${partner.profile?.insuranceProvider ?? ""}${partner.profile?.insuranceExpiration ? ` · ${formatDate(partner.profile.insuranceExpiration)}` : ""}` : null],
                ] as const
              ).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-muted-foreground">{tPartner(`fields.${key}`)}</dt>
                  <dd className="text-foreground">{value || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
          {partner.photos.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {partner.photos.map((p) => (
                <li key={p.id}>
                  <a href={`/api/alliances/${id}/partner-file?photo=${p.id}`} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/alliances/${id}/partner-file?photo=${p.id}`} alt={p.fileName} className="aspect-square w-full rounded-md border border-border object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          {partner.addedClients.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-foreground">{tPartner("addedClients", { count: partner.addedClients.length })}</h3>
              <ul className="flex flex-wrap gap-2">
                {partner.addedClients.map((c) => (
                  <li key={c.id}>
                    <Link href={`/clients/${c.id}`} className="text-sm text-primary underline">
                      {c.fullName}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

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

      {/* Membership */}
      <AllianceMembershipSection
        allianceId={id}
        membership={membership}
        plans={membershipPlans}
        benefits={membershipBenefits}
        linkableInvoices={linkableInvoices}
        canManage={canManageMembership}
        canLinkInvoice={canLinkInvoice}
        onAssign={assignMembershipAction}
        onUpdateTerms={updateMembershipTermsAction}
        onChangeStatus={changeMembershipStatusAction}
        onLinkInvoice={linkMembershipInvoiceAction}
        onAddOverride={addMembershipBenefitOverrideAction}
        onRemoveOverride={removeMembershipBenefitOverrideAction}
      />

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

      {/* Network Connections */}
      <AllianceNetworkSection
        allianceId={id}
        introduced={network.introduced}
        introducedBy={network.introducedBy}
        otherAlliances={otherAlliances}
        onCreate={createAllianceNetworkRelationshipAction}
        onDelete={deleteAllianceNetworkRelationshipAction}
      />

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
                  {bookingTitle(appt.title)} — {appt.clientName}
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
                <div className="flex flex-wrap items-center gap-2">
                  {doc.sensitiveDataReason && <Badge variant="destructive">{tPartner("mayContainSensitiveData")}</Badge>}
                  <PartnerDocumentVisibility documentId={doc.id} visible={doc.visibleToPartner} uploadedByPartner={doc.uploadedByPartner} />
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

      {/* Activity */}
      <AllianceActivitySection activity={activity} />
    </div>
  );
}
