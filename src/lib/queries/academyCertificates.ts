import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  academyCertificates,
  academyEnrollmentDetails,
  academyCourses,
  academyPrograms,
  cases,
  clients,
  type AcademyCourse,
} from "@/lib/db/schema";
import { getCourseReadinessSummary } from "@/lib/queries/academyEvaluationResults";
import type { IssueCertificateFormValues, RevokeCertificateFormValues } from "@/lib/validation/academyCertificate";
import { businessDateString } from "@/lib/dates";

// Display number is always derived from the one true unique sequence value
// — never stored as its own column (see the comment on academyCertificates
// in schema.ts), so it can never drift or collide. The year comes from the
// certificate's own frozen issueDate, never "today", so the number a
// certificate was issued with never changes on a later render.
export function formatCertificateNumber(certificateSeq: number, issueDate: string): string {
  const year = issueDate.slice(0, 4);
  return `AMS-CERT-${year}-${String(certificateSeq).padStart(5, "0")}`;
}

export type CertificateRequirements = {
  minimumAttendance: boolean | null;
  minimumGrade: boolean | null;
  allModulesCompleted: boolean | null;
  allEvaluationsGraded: boolean | null;
};

export type CertificateEligibilityVerdict = "eligible" | "not_eligible" | "not_configured";

export type CertificateEligibility = {
  verdict: CertificateEligibilityVerdict;
  courseCertificateEligible: boolean | null;
  requirements: CertificateRequirements;
  readiness: Awaited<ReturnType<typeof getCourseReadinessSummary>> | null;
};

// The single source of truth for "can this student receive a certificate
// right now" — reuses Phase 2E's getCourseReadinessSummary wholesale
// rather than re-deriving attendance/grade/progress logic. A historical/
// free-text enrollment (course === null, no catalog course to check
// requirements against) always resolves to "not_configured" — eligibility
// is never invented when there's nothing real to check it against.
export async function getCertificateEligibility(
  enrollmentCaseId: string,
  course: Pick<
    AcademyCourse,
    | "id"
    | "certificateEligible"
    | "minimumAttendancePercentage"
    | "minimumOverallGrade"
    | "requireAllActiveModulesCompleted"
    | "requireAllEvaluationsGraded"
  > | null,
): Promise<CertificateEligibility> {
  if (!course) {
    return {
      verdict: "not_configured",
      courseCertificateEligible: null,
      requirements: {
        minimumAttendance: null,
        minimumGrade: null,
        allModulesCompleted: null,
        allEvaluationsGraded: null,
      },
      readiness: null,
    };
  }

  const readiness = await getCourseReadinessSummary(enrollmentCaseId, course);
  const configuredResults = Object.values(readiness.requirements).filter(
    (v): v is boolean => v !== null,
  );

  let verdict: CertificateEligibilityVerdict;
  if (!course.certificateEligible) {
    verdict = "not_eligible";
  } else if (configuredResults.length === 0) {
    verdict = "not_configured";
  } else if (configuredResults.every((met) => met)) {
    verdict = "eligible";
  } else {
    verdict = "not_eligible";
  }

  return {
    verdict,
    courseCertificateEligible: course.certificateEligible,
    requirements: readiness.requirements,
    readiness,
  };
}

// Server-side source of truth for a certificate's identity fields — the
// issuance action calls this instead of trusting anything the browser
// sends, so the frozen snapshot on the certificate row always reflects
// the real client/course/program names at the moment of issuance.
export async function getCertificateIssuanceContext(enrollmentCaseId: string) {
  const [row] = await getDb()
    .select({
      clientId: cases.clientId,
      studentName: clients.fullName,
      courseId: academyEnrollmentDetails.courseId,
      programId: academyEnrollmentDetails.programId,
      legacyCourse: academyEnrollmentDetails.course,
      legacyProgram: academyEnrollmentDetails.program,
      catalogCourseName: academyCourses.name,
      catalogProgramName: academyPrograms.name,
      certificateEligible: academyCourses.certificateEligible,
      minimumAttendancePercentage: academyCourses.minimumAttendancePercentage,
      minimumOverallGrade: academyCourses.minimumOverallGrade,
      requireAllActiveModulesCompleted: academyCourses.requireAllActiveModulesCompleted,
      requireAllEvaluationsGraded: academyCourses.requireAllEvaluationsGraded,
    })
    .from(academyEnrollmentDetails)
    .innerJoin(cases, eq(academyEnrollmentDetails.caseId, cases.id))
    .innerJoin(clients, eq(cases.clientId, clients.id))
    .leftJoin(academyCourses, eq(academyEnrollmentDetails.courseId, academyCourses.id))
    .leftJoin(academyPrograms, eq(academyEnrollmentDetails.programId, academyPrograms.id))
    .where(eq(academyEnrollmentDetails.caseId, enrollmentCaseId))
    .limit(1);

  if (!row) return null;

  return {
    clientId: row.clientId,
    studentName: row.studentName,
    courseId: row.courseId,
    programId: row.programId,
    courseName: row.catalogCourseName ?? row.legacyCourse ?? "—",
    programName: row.catalogProgramName ?? row.legacyProgram ?? null,
    course: row.courseId
      ? {
          id: row.courseId,
          certificateEligible: row.certificateEligible!,
          minimumAttendancePercentage: row.minimumAttendancePercentage,
          minimumOverallGrade: row.minimumOverallGrade,
          requireAllActiveModulesCompleted: row.requireAllActiveModulesCompleted!,
          requireAllEvaluationsGraded: row.requireAllEvaluationsGraded!,
        }
      : null,
  };
}

const ACTIVE_STATUSES = ["draft", "issued"] as const;

export async function listCertificatesForEnrollment(enrollmentCaseId: string) {
  return getDb()
    .select()
    .from(academyCertificates)
    .where(eq(academyCertificates.enrollmentCaseId, enrollmentCaseId))
    .orderBy(desc(academyCertificates.createdAt));
}

export async function getActiveCertificateForEnrollment(enrollmentCaseId: string) {
  const [row] = await getDb()
    .select()
    .from(academyCertificates)
    .where(
      and(
        eq(academyCertificates.enrollmentCaseId, enrollmentCaseId),
        inArray(academyCertificates.status, ACTIVE_STATUSES),
      ),
    )
    .orderBy(desc(academyCertificates.createdAt))
    .limit(1);
  return row ?? null;
}

export async function getCertificateById(id: string) {
  const [row] = await getDb()
    .select()
    .from(academyCertificates)
    .where(eq(academyCertificates.id, id))
    .limit(1);
  return row ?? null;
}

// Cross-enrollment list for the Academy "Certificates" sub-nav tab.
export async function listAllCertificates() {
  return getDb()
    .select({
      certificate: academyCertificates,
      clientFullName: clients.fullName,
    })
    .from(academyCertificates)
    .leftJoin(clients, eq(academyCertificates.clientId, clients.id))
    .orderBy(desc(academyCertificates.createdAt));
}

// Issuance is always one explicit admin action — never automatic. Student/
// course/program names are always re-read from the database here, never
// trusted from client input, so a certificate's frozen snapshot can't be
// tampered with via the form. Blocks a second active (draft/issued)
// certificate for the same enrollment; a prior REVOKED certificate does
// not block a reissue, and is preserved untouched alongside the new row.
export async function issueCertificate(params: {
  enrollmentCaseId: string;
  clientId: string;
  courseId: string | null;
  programId: string | null;
  studentName: string;
  courseName: string;
  programName: string | null;
  values: IssueCertificateFormValues;
}) {
  const db = getDb();

  const existingActive = await getActiveCertificateForEnrollment(params.enrollmentCaseId);
  if (existingActive) {
    throw new Error("A certificate already exists for this enrollment. Revoke it first to reissue.");
  }

  const overrideUsed = Boolean(params.values.overrideUsed);
  const [row] = await db
    .insert(academyCertificates)
    .values({
      enrollmentCaseId: params.enrollmentCaseId,
      clientId: params.clientId,
      courseId: params.courseId,
      programId: params.programId,
      studentNameSnapshot: params.studentName,
      courseNameSnapshot: params.courseName,
      programNameSnapshot: params.programName,
      status: "issued",
      issueDate: businessDateString(),
      completionDate: params.values.completionDate || null,
      issuedBy: params.values.issuedBy,
      notes: params.values.notes || null,
      overrideUsed,
      overrideReason: overrideUsed ? params.values.overrideReason || null : null,
    })
    .returning();

  return row;
}

export async function revokeCertificate(id: string, values: RevokeCertificateFormValues) {
  const db = getDb();

  const [existing] = await db
    .select({ status: academyCertificates.status })
    .from(academyCertificates)
    .where(eq(academyCertificates.id, id))
    .limit(1);
  if (!existing) throw new Error("Certificate not found");
  if (existing.status === "revoked") throw new Error("This certificate is already revoked");

  const [row] = await db
    .update(academyCertificates)
    .set({
      status: "revoked",
      revokedAt: new Date(),
      revokedReason: values.reason,
      updatedAt: new Date(),
    })
    .where(eq(academyCertificates.id, id))
    .returning();

  return row;
}

