import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listRecentAuditLog } from "@/lib/queries/auditLog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function AuditLogPage() {
  const t = await getTranslations("AuditLog");
  const configured = isDatabaseConfigured();
  const entries = configured ? await listRecentAuditLog() : [];

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <Link
          href="/settings"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToSettings")}
        </Link>
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured &&
        (entries.length === 0 ? (
          <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
            {t("empty")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnDate")}</TableHead>
                  <TableHead>{t("columnActor")}</TableHead>
                  <TableHead>{t("columnAction")}</TableHead>
                  <TableHead>{t("columnSummary")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.actorEmail ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.action}</Badge>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {entry.summary}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
    </div>
  );
}
