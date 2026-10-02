import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { AcademyStatusBadge } from "./AcademyStatusBadge";

// Phase 2G — the one-glance summary at the top of each enrollment block on
// the Student 360 page. Every value here is either already computed by an
// existing Phase 2D/2E/2F query (percentage/grade/eligibility) or a direct
// column read — nothing is invented. Colors follow the existing semantic
// convention (see AcademyStatusBadge): --primary for ongoing/operational
// states, --success only for a genuine terminal/positive outcome
// (certificate issued, course completed), never for "active" by itself.
export async function StudentAdministrativeSummary({
  caseId,
  courseId,
  academyStatus,
  courseName,
  programName,
  instructorName,
  progressPercentage,
  attendancePercentage,
  overallGrade,
  certificateVerdict,
  activeCertificateStatus,
  enrollmentOutstandingBalance,
}: {
  caseId: string;
  courseId: string | null;
  academyStatus: string;
  courseName: string | null;
  programName: string | null;
  instructorName: string | null;
  progressPercentage: number | null;
  attendancePercentage: number | null;
  overallGrade: number | null;
  certificateVerdict: "eligible" | "not_eligible" | "not_configured";
  activeCertificateStatus: "draft" | "issued" | "revoked" | null;
  enrollmentOutstandingBalance: number | null;
}) {
  const t = await getTranslations("AcademyStudent360");
  const tCert = await getTranslations("AcademyCertificates");
  const tCertStatus = await getTranslations("AcademyCertificateStatus");

  const certificateDisplay = activeCertificateStatus
    ? tCertStatus(activeCertificateStatus)
    : tCert(certificateVerdict);
  const certificateIsPositive = activeCertificateStatus === "issued";

  return (
    <div className="grid gap-4 rounded-lg border border-border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4">
      <div className="col-span-full flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {[programName, courseName].filter(Boolean).join(" — ") || t("noCatalogCourse")}
          </p>
          {instructorName && (
            <p className="text-xs text-muted-foreground">
              {t("instructor")}: {instructorName}
            </p>
          )}
        </div>
        <AcademyStatusBadge status={academyStatus} />
      </div>

      <div>
        <p className="text-xs uppercase text-muted-foreground">{t("progress")}</p>
        <p className="font-heading text-xl text-foreground">
          {progressPercentage != null ? `${progressPercentage}%` : t("notAvailable")}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">{t("attendance")}</p>
        <p className="font-heading text-xl text-foreground">
          {attendancePercentage != null ? `${attendancePercentage}%` : t("notAvailable")}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">{t("overallGrade")}</p>
        <p className="font-heading text-xl text-foreground">
          {overallGrade != null ? `${overallGrade}%` : t("notAvailable")}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">{t("certificate")}</p>
        <Badge
          className={
            certificateIsPositive
              ? "border-transparent bg-success text-success-foreground"
              : "border-border text-muted-foreground bg-transparent"
          }
        >
          {certificateDisplay}
        </Badge>
      </div>

      {enrollmentOutstandingBalance != null && (
        <div className="col-span-full">
          <p className="text-xs uppercase text-muted-foreground">
            {t("enrollmentOutstandingBalance")}
          </p>
          <p className="text-sm text-foreground">
            ${enrollmentOutstandingBalance.toFixed(2)}
          </p>
        </div>
      )}

      <div className="col-span-full flex flex-wrap gap-3 text-sm">
        <Link href={`/cases/${caseId}`} className="text-primary underline">
          {t("viewFullEnrollmentRecord")}
        </Link>
        {courseId && (
          <Link href={`/academy/courses/${courseId}`} className="text-primary underline">
            {t("viewCourse")}
          </Link>
        )}
      </div>
    </div>
  );
}
