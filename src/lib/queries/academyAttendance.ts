import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  academyAttendanceRecords,
  academyAttendanceSessions,
  academyEnrollmentDetails,
  cases,
  clients,
} from "@/lib/db/schema";
import type { AcademyAttendanceSessionFormValues } from "@/lib/validation/academyAttendanceSession";
import type { AcademyAttendanceRecordFormValues } from "@/lib/validation/academyAttendanceRecord";

export async function listAttendanceSessionsForCourse(courseId: string) {
  return getDb()
    .select()
    .from(academyAttendanceSessions)
    .where(eq(academyAttendanceSessions.courseId, courseId))
    .orderBy(desc(academyAttendanceSessions.sessionDate));
}

export async function createAttendanceSession(
  courseId: string,
  values: AcademyAttendanceSessionFormValues,
) {
  await getDb()
    .insert(academyAttendanceSessions)
    .values({
      courseId,
      sessionDate: values.sessionDate,
      title: values.title || null,
      notes: values.notes || null,
    });
}

export async function updateAttendanceSession(
  id: string,
  values: AcademyAttendanceSessionFormValues,
) {
  await getDb()
    .update(academyAttendanceSessions)
    .set({
      sessionDate: values.sessionDate,
      title: values.title || null,
      notes: values.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(academyAttendanceSessions.id, id));
}

// Students currently enrolled (catalog-linked) in this course — the roster
// a session's attendance can be marked against.
export async function listEnrollmentsForCourse(courseId: string) {
  return getDb()
    .select({
      enrollmentCaseId: academyEnrollmentDetails.caseId,
      clientId: clients.id,
      clientName: clients.fullName,
    })
    .from(academyEnrollmentDetails)
    .innerJoin(cases, eq(academyEnrollmentDetails.caseId, cases.id))
    .innerJoin(clients, eq(cases.clientId, clients.id))
    .where(eq(academyEnrollmentDetails.courseId, courseId))
    .orderBy(clients.fullName);
}

// Roster for one session, left-joined against any existing attendance
// record so unmarked students still show up (defaulting to "not marked"
// rather than being omitted).
export async function listAttendanceForSession(sessionId: string, courseId: string) {
  const db = getDb();
  const [roster, records] = await Promise.all([
    listEnrollmentsForCourse(courseId),
    db
      .select()
      .from(academyAttendanceRecords)
      .where(eq(academyAttendanceRecords.sessionId, sessionId)),
  ]);

  const recordByEnrollment = new Map(records.map((r) => [r.enrollmentCaseId, r]));

  return roster.map((student) => {
    const record = recordByEnrollment.get(student.enrollmentCaseId);
    return {
      ...student,
      attendanceStatus: record?.attendanceStatus ?? null,
      notes: record?.notes ?? null,
    };
  });
}

export async function upsertAttendanceRecord(
  sessionId: string,
  enrollmentCaseId: string,
  values: AcademyAttendanceRecordFormValues,
) {
  const db = getDb();
  const [existing] = await db
    .select({ id: academyAttendanceRecords.id })
    .from(academyAttendanceRecords)
    .where(
      and(
        eq(academyAttendanceRecords.sessionId, sessionId),
        eq(academyAttendanceRecords.enrollmentCaseId, enrollmentCaseId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(academyAttendanceRecords)
      .set({
        attendanceStatus: values.attendanceStatus,
        notes: values.notes || null,
        markedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(academyAttendanceRecords.id, existing.id));
    return;
  }

  await db.insert(academyAttendanceRecords).values({
    sessionId,
    enrollmentCaseId,
    attendanceStatus: values.attendanceStatus,
    notes: values.notes || null,
  });
}

// Attendance percentage rule (documented per Phase 2D spec section 5):
// Present and Late both count as "attended"; Absent counts as "not
// attended"; Excused is excluded from the denominator entirely. E.g. 3
// Present + 1 Late + 1 Absent + 1 Excused -> denominator 5, attended 4,
// attendance 80%.
export async function getAttendanceSummaryForEnrollment(enrollmentCaseId: string) {
  const db = getDb();
  const records = await db
    .select({
      attendanceStatus: academyAttendanceRecords.attendanceStatus,
      sessionId: academyAttendanceRecords.sessionId,
      sessionDate: academyAttendanceSessions.sessionDate,
      sessionTitle: academyAttendanceSessions.title,
    })
    .from(academyAttendanceRecords)
    .innerJoin(
      academyAttendanceSessions,
      eq(academyAttendanceRecords.sessionId, academyAttendanceSessions.id),
    )
    .where(eq(academyAttendanceRecords.enrollmentCaseId, enrollmentCaseId))
    .orderBy(desc(academyAttendanceSessions.sessionDate));

  const present = records.filter((r) => r.attendanceStatus === "present").length;
  const late = records.filter((r) => r.attendanceStatus === "late").length;
  const absent = records.filter((r) => r.attendanceStatus === "absent").length;
  const excused = records.filter((r) => r.attendanceStatus === "excused").length;

  const attended = present + late;
  const denominator = present + late + absent;
  const percentage = denominator === 0 ? null : Math.round((attended / denominator) * 100);

  return {
    present,
    late,
    absent,
    excused,
    attended,
    denominator,
    percentage,
    recentSessions: records.slice(0, 10),
  };
}
