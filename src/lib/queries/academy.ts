import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { cases, clients, academyEnrollmentDetails } from "@/lib/db/schema";

// Academy's own sidebar module — unlike /cases (every service mixed
// together), this is filtered to serviceType "academy" only, so "View
// All" from the Dashboard's Academy section actually shows just
// students. cases.startDate/dueDate double as the program's start/target
// dates (see the comment on academyEnrollmentDetails in schema.ts) rather
// than duplicating them here.
export async function listAcademyEnrollments() {
  return getDb()
    .select({
      caseId: cases.id,
      clientId: clients.id,
      studentName: clients.fullName,
      title: cases.title,
      startDate: cases.startDate,
      dueDate: cases.dueDate,
      program: academyEnrollmentDetails.program,
      course: academyEnrollmentDetails.course,
      courseFormat: academyEnrollmentDetails.courseFormat,
      enrollmentDate: academyEnrollmentDetails.enrollmentDate,
      progressPercentage: academyEnrollmentDetails.progressPercentage,
      certificateDate: academyEnrollmentDetails.certificateDate,
      status: academyEnrollmentDetails.status,
      highlevelSyncStatus: academyEnrollmentDetails.highlevelSyncStatus,
    })
    .from(cases)
    .innerJoin(clients, eq(cases.clientId, clients.id))
    .leftJoin(academyEnrollmentDetails, eq(academyEnrollmentDetails.caseId, cases.id))
    .where(eq(cases.serviceType, "academy"))
    .orderBy(desc(cases.startDate));
}

// Phase 2G — Academy Administrative Center. A student can have more than
// one Academy enrollment (see the comment on listAcademyEnrollmentsForFolders
// in queries/documents.ts), so the Student 360 page lists every one of this
// client's academy cases rather than assuming exactly one. Deliberately a
// thin, direct query (not a reuse of the much heavier getCaseById, which
// joins all 14 service-detail tables) — this is the same shape as
// listAcademyEnrollments above, just scoped to one client instead of every
// student.
export async function listAcademyEnrollmentsForClient(clientId: string) {
  return getDb()
    .select({
      caseId: cases.id,
      caseStatus: cases.status,
      title: cases.title,
      startDate: cases.startDate,
      dueDate: cases.dueDate,
      academyStatus: academyEnrollmentDetails.status,
      programId: academyEnrollmentDetails.programId,
      courseId: academyEnrollmentDetails.courseId,
      program: academyEnrollmentDetails.program,
      course: academyEnrollmentDetails.course,
      courseFormat: academyEnrollmentDetails.courseFormat,
      enrollmentDate: academyEnrollmentDetails.enrollmentDate,
      // Legacy fields — never recomputed or overwritten here, only ever
      // read and displayed as historical (see Phase 2G section 6/J).
      legacyCertificateDate: academyEnrollmentDetails.certificateDate,
      legacyProgressPercentage: academyEnrollmentDetails.progressPercentage,
      legacyAttendancePercentage: academyEnrollmentDetails.attendancePercentage,
      legacyModulesCompleted: academyEnrollmentDetails.modulesCompleted,
      legacyAssignmentsCompleted: academyEnrollmentDetails.assignmentsCompleted,
      legacyFinalEvaluation: academyEnrollmentDetails.finalEvaluation,
      communityAccess: academyEnrollmentDetails.communityAccess,
    })
    .from(cases)
    .innerJoin(academyEnrollmentDetails, eq(academyEnrollmentDetails.caseId, cases.id))
    .where(and(eq(cases.clientId, clientId), eq(cases.serviceType, "academy")))
    .orderBy(desc(cases.startDate));
}
