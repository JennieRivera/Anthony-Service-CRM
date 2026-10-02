import { notFound } from "next/navigation";
import { Diamond } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getClientById } from "@/lib/queries/clients";
import { auth } from "@/auth";
import { listAcademyEnrollmentsForClient } from "@/lib/queries/academy";
import { getAcademyCourseById } from "@/lib/queries/academyCourses";
import { listCourseModuleProgress } from "@/lib/queries/academyProgress";
import { getAttendanceSummaryForEnrollment } from "@/lib/queries/academyAttendance";
import {
  listEvaluationsWithResultForEnrollment,
  getCourseReadinessSummary,
} from "@/lib/queries/academyEvaluationResults";
import {
  getCertificateEligibility,
  getActiveCertificateForEnrollment,
  listCertificatesForEnrollment,
} from "@/lib/queries/academyCertificates";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AcademySubNav } from "@/components/academy/AcademySubNav";
import { StudentAdministrativeSummary } from "@/components/academy/StudentAdministrativeSummary";
import { EnrollmentProgressSection } from "@/components/academy/EnrollmentProgressSection";
import { EnrollmentAttendanceSummary } from "@/components/academy/EnrollmentAttendanceSummary";
import { EnrollmentEvaluationsSection } from "@/components/academy/EnrollmentEvaluationsSection";
import { EnrollmentCertificateSection } from "@/components/academy/EnrollmentCertificateSection";
import { StudentCommunicationsList } from "@/components/academy/StudentCommunicationsList";
import { StudentAppointmentsList } from "@/components/academy/StudentAppointmentsList";
import { StudentFinanceList } from "@/components/academy/StudentFinanceList";
import { DocumentList } from "@/components/documents/DocumentList";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import { formatDate } from "@/lib/dates";
import { getCurrentRole, hasAccessArea } from "@/lib/permissions";
import AccessDenied from "@/components/AccessDenied";

// Phase 2G — Academy Administrative Center. This is deliberately NOT a
// second student system: the client row, enrollment cases, documents,
// communications, appointments, invoices and payments below are all the
// exact same rows every other CRM screen already reads (getClientById is
// reused verbatim), and every academic number (progress/attendance/grade/
// certificate) comes from the same Phase 2D/2E/2F query functions already
// used on cases/[id]/page.tsx — called again here, never reimplemented.
export default async function AcademyStudent360Page({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const t = await getTranslations("AcademyStudent360");
  const tAcademy = await getTranslations("Academy");
  const configured = isDatabaseConfigured();

  if (!configured) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{tAcademy("title")}</h1>
        <DatabaseNotConfigured />
      </div>
    );
  }

  // Phase 2H — section 5: the Academy module's own page-level guard. A
  // role with no "academy" access never reaches the data below at all
  // (not just a hidden section) — compare to the four independent
  // student360_* checks further down, which gate the cross-cutting
  // sections of this SAME page separately, since "academy" must never
  // silently imply any of them (see src/lib/permissions.ts).
  const role = await getCurrentRole();
  if (!role || !hasAccessArea(role, "academy")) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{tAcademy("title")}</h1>
        <AccessDenied />
      </div>
    );
  }

  const clientData = await getClientById(clientId);
  if (!clientData) notFound();
  const { client, documents, conversations, appointments, invoices, payments, outstandingBalance } =
    clientData;

  const canViewFinance = hasAccessArea(role, "student360_finance");
  const canViewDocuments = hasAccessArea(role, "student360_documents");
  const canViewCommunications = hasAccessArea(role, "student360_communications");
  const canViewCalendar = hasAccessArea(role, "student360_calendar");

  const enrollments = await listAcademyEnrollmentsForClient(clientId);
  const session = await auth();
  const defaultIssuedBy = session?.user?.name ?? session?.user?.email ?? "";

  const enrollmentDetails = await Promise.all(
    enrollments.map(async (enrollment) => {
      const course = enrollment.courseId ? await getAcademyCourseById(enrollment.courseId) : null;

      const [moduleProgress, attendanceSummary, evaluationsWithResults, readiness] = enrollment.courseId
        ? await Promise.all([
            listCourseModuleProgress(enrollment.caseId, enrollment.courseId),
            getAttendanceSummaryForEnrollment(enrollment.caseId),
            listEvaluationsWithResultForEnrollment(enrollment.caseId, enrollment.courseId),
            course
              ? getCourseReadinessSummary(enrollment.caseId, {
                  id: enrollment.courseId,
                  minimumAttendancePercentage: course.minimumAttendancePercentage,
                  minimumOverallGrade: course.minimumOverallGrade,
                  requireAllActiveModulesCompleted: course.requireAllActiveModulesCompleted,
                  requireAllEvaluationsGraded: course.requireAllEvaluationsGraded,
                })
              : null,
          ])
        : [null, null, null, null];

      const certificateEligibility = await getCertificateEligibility(
        enrollment.caseId,
        enrollment.courseId && course
          ? {
              id: enrollment.courseId,
              certificateEligible: course.certificateEligible,
              minimumAttendancePercentage: course.minimumAttendancePercentage,
              minimumOverallGrade: course.minimumOverallGrade,
              requireAllActiveModulesCompleted: course.requireAllActiveModulesCompleted,
              requireAllEvaluationsGraded: course.requireAllEvaluationsGraded,
            }
          : null,
      );
      const activeCertificate = await getActiveCertificateForEnrollment(enrollment.caseId);
      const certificateHistory = await listCertificatesForEnrollment(enrollment.caseId);

      const enrollmentInvoices = invoices.filter((inv) => inv.caseId === enrollment.caseId);
      const enrollmentOutstandingBalance = enrollmentInvoices.length
        ? enrollmentInvoices
            .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
            .reduce((sum, inv) => sum + Number(inv.total), 0)
        : null;

      return {
        enrollment,
        course,
        moduleProgress,
        attendanceSummary,
        evaluationsWithResults,
        readiness,
        certificateEligibility,
        activeCertificate,
        certificateHistory,
        enrollmentOutstandingBalance,
      };
    }),
  );

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{tAcademy("title")}</h1>
      <AcademySubNav active="students" />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xl text-foreground">{client.fullName}</h2>
            <Diamond
              aria-hidden="true"
              className="diamond-badge-glow h-4 w-4 text-[#78B7D0]"
              fill="#FAFCFF"
              strokeWidth={1.5}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {[client.email, client.phone].filter(Boolean).join(" · ") || t("noContactInfo")}
          </p>
        </div>
        <Button variant="outline" render={<Link href={`/clients/${client.id}`} />}>
          {t("viewClientRecord")}
        </Button>
      </div>

      {enrollmentDetails.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("noEnrollments")}
        </p>
      ) : (
        enrollmentDetails.map(
          ({
            enrollment,
            course,
            moduleProgress,
            attendanceSummary,
            evaluationsWithResults,
            readiness,
            certificateEligibility,
            activeCertificate,
            certificateHistory,
            enrollmentOutstandingBalance,
          }) => (
            <div key={enrollment.caseId} className="flex flex-col gap-4">
              <StudentAdministrativeSummary
                caseId={enrollment.caseId}
                courseId={enrollment.courseId}
                academyStatus={enrollment.academyStatus ?? "lead"}
                courseName={course?.name ?? enrollment.course}
                programName={course?.programName ?? enrollment.program}
                instructorName={course?.instructorClientName ?? course?.instructorName ?? null}
                progressPercentage={moduleProgress?.percentage ?? null}
                attendancePercentage={attendanceSummary?.percentage ?? null}
                overallGrade={readiness?.gradeInfo.grade ?? null}
                certificateVerdict={certificateEligibility.verdict}
                activeCertificateStatus={activeCertificate?.status ?? null}
                enrollmentOutstandingBalance={canViewFinance ? enrollmentOutstandingBalance : null}
              />

              {!enrollment.courseId && (
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm">
                  <p className="font-medium text-foreground">{t("legacyEnrollmentTitle")}</p>
                  <p className="text-muted-foreground">{t("legacyEnrollmentHint")}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p>
                      {t("legacyProgress")}:{" "}
                      {enrollment.legacyProgressPercentage != null
                        ? `${enrollment.legacyProgressPercentage}%`
                        : t("notAvailable")}
                    </p>
                    <p>
                      {t("legacyAttendance")}:{" "}
                      {enrollment.legacyAttendancePercentage != null
                        ? `${enrollment.legacyAttendancePercentage}%`
                        : t("notAvailable")}
                    </p>
                    <p>
                      {t("legacyModulesCompleted")}: {enrollment.legacyModulesCompleted ?? t("notAvailable")}
                    </p>
                    <p>
                      {t("legacyAssignmentsCompleted")}:{" "}
                      {enrollment.legacyAssignmentsCompleted ?? t("notAvailable")}
                    </p>
                  </div>
                  {enrollment.legacyFinalEvaluation && (
                    <p>
                      {t("legacyFinalEvaluation")}: {enrollment.legacyFinalEvaluation}
                    </p>
                  )}
                  {enrollment.legacyCertificateDate && (
                    <p className="text-amber-900">
                      {t("legacyCertificateDate")}: {formatDate(enrollment.legacyCertificateDate)} —{" "}
                      {t("legacyCertificateDateHint")}
                    </p>
                  )}
                </div>
              )}

              {enrollment.courseId && moduleProgress && course && (
                <EnrollmentProgressSection
                  enrollmentCaseId={enrollment.caseId}
                  courseId={enrollment.courseId}
                  clientId={client.id}
                  courseName={course.name}
                  programName={course.programName}
                  instructorName={course.instructorClientName ?? course.instructorName}
                  completedCount={moduleProgress.completedCount}
                  totalCount={moduleProgress.totalCount}
                  percentage={moduleProgress.percentage}
                  modules={moduleProgress.modules}
                />
              )}

              {enrollment.courseId && attendanceSummary && attendanceSummary.recentSessions.length > 0 && (
                <EnrollmentAttendanceSummary
                  percentage={attendanceSummary.percentage}
                  present={attendanceSummary.present}
                  late={attendanceSummary.late}
                  absent={attendanceSummary.absent}
                  excused={attendanceSummary.excused}
                  recentSessions={attendanceSummary.recentSessions.map((s) => ({
                    sessionId: s.sessionId,
                    sessionDate: s.sessionDate,
                    sessionTitle: s.sessionTitle,
                    attendanceStatus: s.attendanceStatus,
                  }))}
                />
              )}

              {enrollment.courseId && evaluationsWithResults && readiness && (
                <EnrollmentEvaluationsSection
                  evaluations={evaluationsWithResults}
                  gradedCount={readiness.gradeInfo.gradedCount}
                  totalActive={readiness.gradeInfo.totalActive}
                  overallGrade={readiness.gradeInfo.grade}
                  provisional={readiness.gradeInfo.provisional}
                  requirements={readiness.requirements}
                />
              )}

              <EnrollmentCertificateSection
                enrollmentCaseId={enrollment.caseId}
                verdict={certificateEligibility.verdict}
                requirements={certificateEligibility.requirements}
                activeCertificate={activeCertificate}
                history={certificateHistory}
                defaultIssuedBy={defaultIssuedBy}
              />

              {/* Phase 2G section 6 — a catalog enrollment's legacy
                  certificateDate is never merged into the Certificate
                  section above (the new academy_certificates table is the
                  sole authority there). When a legacy value exists, it's
                  surfaced here only as a clearly-labeled historical note,
                  never as a competing status. */}
              {enrollment.courseId && enrollment.legacyCertificateDate && (
                <p className="text-sm text-muted-foreground">
                  {t("legacyCertificateDate")}: {formatDate(enrollment.legacyCertificateDate)} —{" "}
                  {t("legacyCertificateDateHint")}
                </p>
              )}
            </div>
          ),
        )
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Phase 2H — each of these four sections is gated by its OWN
            student360_* permission, independent of "academy" above and
            independent of each other. An Academy Staff role has the
            first three by default but never student360_finance (see
            ROLE_PERMISSIONS in src/lib/permissions.ts) — seeing a
            student's academic record must never imply seeing their
            financial record. */}
        {canViewDocuments && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
            <h2 className="font-heading text-lg text-foreground">{t("documentsTitle")}</h2>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noDocuments")}</p>
            ) : (
              <DocumentList documents={documents.slice(0, 10)} />
            )}
            <Link href={`/clients/${client.id}`} className="text-sm text-primary underline">
              {t("manageDocuments")}
            </Link>
          </div>
        )}

        {canViewCommunications && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
            <h2 className="font-heading text-lg text-foreground">{t("communicationsTitle")}</h2>
            <StudentCommunicationsList conversations={conversations} />
          </div>
        )}

        {canViewCalendar && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
            <h2 className="font-heading text-lg text-foreground">{t("calendarTitle")}</h2>
            <StudentAppointmentsList appointments={appointments} />
          </div>
        )}
      </div>

      {canViewFinance && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-lg text-foreground">{t("financeTitle")}</h2>
          <StudentFinanceList invoices={invoices} payments={payments} outstandingBalance={outstandingBalance} />
        </div>
      )}
    </div>
  );
}
