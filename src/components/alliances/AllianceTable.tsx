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
import { AllianceStatusBadge } from "./AllianceStatusBadge";
import type { listAlliances } from "@/lib/queries/alliances";

export async function AllianceTable({
  alliances,
}: {
  alliances: Awaited<ReturnType<typeof listAlliances>>;
}) {
  const t = await getTranslations("Alliances");
  const tOrgType = await getTranslations("OrganizationType");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnOrganization")}</TableHead>
            <TableHead>{t("columnType")}</TableHead>
            <TableHead>{t("columnContact")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnNextFollowUp")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alliances.map((alliance) => (
            <TableRow key={alliance.id}>
              <TableCell>
                <Link
                  href={`/alliances/${alliance.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {alliance.organizationName}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {alliance.organizationType
                  ? tOrgType(alliance.organizationType)
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <div className="flex flex-col">
                  <span>{alliance.contactPerson ?? "—"}</span>
                  <span className="text-xs">{alliance.email ?? "—"}</span>
                </div>
              </TableCell>
              <TableCell>
                <AllianceStatusBadge status={alliance.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {alliance.nextFollowUp
                  ? new Date(alliance.nextFollowUp).toLocaleDateString()
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
