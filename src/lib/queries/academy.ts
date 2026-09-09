import { desc, eq } from "drizzle-orm";
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
