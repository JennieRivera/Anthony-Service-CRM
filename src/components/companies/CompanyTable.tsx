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
import type { Company } from "@/lib/db/schema";

export async function CompanyTable({ companies }: { companies: Company[] }) {
  const t = await getTranslations("Companies");
  const tEntityType = await getTranslations("CompanyEntityType");
  const tEinStatus = await getTranslations("CompanyEinStatus");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnName")}</TableHead>
            <TableHead>{t("columnEntityType")}</TableHead>
            <TableHead>{t("columnState")}</TableHead>
            <TableHead>{t("columnEinStatus")}</TableHead>
            <TableHead>{t("columnIndustry")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell>
                <Link
                  href={`/companies/${company.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {company.legalBusinessName}
                </Link>
                {company.dbaName && (
                  <div className="text-xs text-muted-foreground">
                    DBA: {company.dbaName}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {company.entityType ? tEntityType(company.entityType) : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {company.stateOfFormation ?? "—"}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{tEinStatus(company.einStatus)}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {company.industry ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
