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
import { AcademyStatusBadge } from "./AcademyStatusBadge";
import type { listAcademyEnrollments } from "@/lib/queries/academy";

export async function AcademyTable({
  students,
}: {
  students: Awaited<ReturnType<typeof listAcademyEnrollments>>;
}) {
  const t = await getTranslations("Academy");
  const tCourseFormat = await getTranslations("CourseFormat");

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnStudent")}</TableHead>
            <TableHead>{t("columnProgramCourse")}</TableHead>
            <TableHead>{t("columnFormat")}</TableHead>
            <TableHead>{t("columnStartDate")}</TableHead>
            <TableHead>{t("columnEndDate")}</TableHead>
            <TableHead>{t("columnProgress")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((s) => (
            <TableRow key={s.caseId}>
              <TableCell>
                <Link
                  href={`/cases/${s.caseId}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {s.studentName}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {[s.program, s.course].filter(Boolean).join(" — ") || s.title}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {s.courseFormat ? tCourseFormat(s.courseFormat) : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {s.startDate ? new Date(s.startDate).toLocaleDateString() : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {s.certificateDate
                  ? new Date(s.certificateDate).toLocaleDateString()
                  : s.dueDate
                    ? new Date(s.dueDate).toLocaleDateString()
                    : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {s.progressPercentage != null ? `${s.progressPercentage}%` : "—"}
              </TableCell>
              <TableCell>
                <AcademyStatusBadge status={s.status ?? "lead"} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
