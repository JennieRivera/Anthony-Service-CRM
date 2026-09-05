import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AssociationStatusBadge } from "./AssociationStatusBadge";
import type { listAssociationsChambers } from "@/lib/queries/associationsChambers";

export async function AssociationTable({
  organizations,
}: {
  organizations: Awaited<ReturnType<typeof listAssociationsChambers>>;
}) {
  const t = await getTranslations("Associations");
  const tOrgType = await getTranslations("AssociationOrganizationType");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnOrganization")}</TableHead>
            <TableHead>{t("columnType")}</TableHead>
            <TableHead>{t("columnState")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnNextFollowUp")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org) => (
            <TableRow key={org.id}>
              <TableCell>
                <Link
                  href={`/associations/${org.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {org.organizationName}
                </Link>
                {org.latinoFocus && (
                  <Badge variant="outline" className="ml-2">
                    {t("latinoFocusBadge")}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tOrgType(org.organizationType)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {org.state ?? "—"}
              </TableCell>
              <TableCell>
                <AssociationStatusBadge status={org.amsRelationshipStatus} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {org.nextFollowUp
                  ? new Date(org.nextFollowUp).toLocaleDateString()
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
