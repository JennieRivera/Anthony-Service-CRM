import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAssociationChamberById } from "@/lib/queries/associationsChambers";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssociationStatusBadge } from "@/components/associations/AssociationStatusBadge";
import { AssociationActiveToggle } from "@/components/associations/AssociationActiveToggle";

export default async function AssociationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Associations");
  const tOrgType = await getTranslations("AssociationOrganizationType");

  const org = await getAssociationChamberById(id);
  if (!org) notFound();

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/associations"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToAssociations")}
        </Link>
        <div className="flex gap-2">
          <AssociationActiveToggle id={id} active={org.active} />
          <Button render={<Link href={`/associations/${id}/edit`} />}>
            <Pencil className="h-4 w-4" />
            {t("editOrganization")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl text-foreground">
              {org.organizationName}
            </h1>
            {org.latinoFocus && (
              <Badge variant="outline">{t("latinoFocusBadge")}</Badge>
            )}
            {!org.active && (
              <Badge variant="outline" className="text-muted-foreground">
                {t("inactiveBadge")}
              </Badge>
            )}
          </div>
          <AssociationStatusBadge status={org.amsRelationshipStatus} />
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("form.organizationType")}</p>
            <p className="text-foreground">{tOrgType(org.organizationType)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.contactPerson")}</p>
            <p className="text-foreground">{org.contactPerson ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.phone")}</p>
            <p className="text-foreground">{org.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.email")}</p>
            <p className="text-foreground">{org.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.website")}</p>
            <p className="text-foreground">{org.website ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {t("form.city")} / {t("form.state")}
            </p>
            <p className="text-foreground">
              {[org.city, org.state].filter(Boolean).join(", ") || "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.country")}</p>
            <p className="text-foreground">{org.country ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.industryFocus")}</p>
            <p className="text-foreground">{org.industryFocus ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.membershipStatus")}</p>
            <p className="text-foreground">{org.membershipStatus ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.membershipCost")}</p>
            <p className="text-foreground">{org.membershipCost ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.dateContacted")}</p>
            <p className="text-foreground">
              {org.dateContacted
                ? new Date(org.dateContacted).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.lastContact")}</p>
            <p className="text-foreground">
              {org.lastContact
                ? new Date(org.lastContact).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.nextFollowUp")}</p>
            <p className="text-foreground">
              {org.nextFollowUp
                ? new Date(org.nextFollowUp).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.lastVerifiedDate")}</p>
            <p className="text-foreground">
              {org.lastVerifiedDate
                ? new Date(org.lastVerifiedDate).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.verifiedBy")}</p>
            <p className="text-foreground">{org.verifiedBy ?? "—"}</p>
          </div>
        </div>
        {org.partnershipOpportunity && (
          <div className="text-sm">
            <p className="text-muted-foreground">
              {t("form.partnershipOpportunity")}
            </p>
            <p className="whitespace-pre-wrap text-foreground">
              {org.partnershipOpportunity}
            </p>
          </div>
        )}
        {org.notes && (
          <div className="text-sm">
            <p className="text-muted-foreground">{t("form.notes")}</p>
            <p className="whitespace-pre-wrap text-foreground">{org.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
