import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listAllCertificates, formatCertificateNumber } from "@/lib/queries/academyCertificates";
import { AcademySubNav } from "@/components/academy/AcademySubNav";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/dates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusClasses: Record<string, string> = {
  draft: "border-border text-muted-foreground bg-transparent",
  issued: "border-transparent bg-success text-success-foreground",
  revoked: "border-transparent bg-destructive text-destructive-foreground",
};

export default async function AcademyCertificatesPage() {
  const t = await getTranslations("Academy");
  const tCert = await getTranslations("AcademyCertificates");
  const tStatus = await getTranslations("AcademyCertificateStatus");
  const configured = isDatabaseConfigured();

  let rows: Awaited<ReturnType<typeof listAllCertificates>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      rows = await listAllCertificates();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
      <AcademySubNav active="certificates" />

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load certificates: {error}.
        </p>
      )}

      {configured && !error && (
        rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{tCert("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCert("columnNumber")}</TableHead>
                <TableHead>{tCert("columnStudent")}</TableHead>
                <TableHead>{tCert("columnCourse")}</TableHead>
                <TableHead>{tCert("columnIssueDate")}</TableHead>
                <TableHead>{tCert("columnStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ certificate, clientFullName }) => (
                <TableRow key={certificate.id}>
                  <TableCell>
                    <Link
                      href={`/academy/certificates/${certificate.id}`}
                      className="text-primary underline"
                    >
                      {formatCertificateNumber(certificate.certificateSeq, certificate.issueDate)}
                    </Link>
                  </TableCell>
                  <TableCell>{clientFullName ?? certificate.studentNameSnapshot}</TableCell>
                  <TableCell>{certificate.courseNameSnapshot}</TableCell>
                  <TableCell>{formatDate(certificate.issueDate)}</TableCell>
                  <TableCell>
                    <Badge className={statusClasses[certificate.status]}>
                      {tStatus(certificate.status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )
      )}
    </div>
  );
}
