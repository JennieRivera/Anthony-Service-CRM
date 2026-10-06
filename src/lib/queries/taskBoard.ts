import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { appointments, cases, clients, documents, strategicAlliances, taskNotes, tasks } from "@/lib/db/schema";

// The /tasks page: every open task with what its detail panel and its
// direct button need (appointment, document, notes). Kept apart from
// listOpenTasks(), which MIADIAMANTE reuses verbatim and which must stay
// free of notes.

const PORTAL_UPLOAD_PREFIXES = ["Client upload (may contain sensitive data): ", "Client upload: "];

export async function listTaskBoard() {
  const db = getDb();
  const rows = await db
    .select({
      id: tasks.id,
      type: tasks.type,
      title: tasks.title,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      // A task is about a client, an alliance (partner portal), or both.
      clientId: clients.id,
      clientName: clients.fullName,
      allianceId: strategicAlliances.id,
      allianceName: strategicAlliances.organizationName,
      caseId: cases.id,
      caseTitle: cases.title,
      appointmentId: appointments.id,
      appointmentTitle: appointments.title,
      appointmentStartAt: appointments.startAt,
      documentId: tasks.documentId,
      referralId: tasks.referralId,
    })
    .from(tasks)
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .leftJoin(strategicAlliances, eq(tasks.allianceId, strategicAlliances.id))
    .leftJoin(cases, eq(tasks.caseId, cases.id))
    .leftJoin(appointments, eq(tasks.appointmentId, appointments.id))
    .where(eq(tasks.status, "open"))
    .orderBy(asc(tasks.dueDate), asc(tasks.createdAt));

  // Review tasks created before tasks.documentId existed: find the client's
  // own upload by the file name the title carries.
  const legacy = rows.filter((r) => r.type === "document_review" && !r.documentId);
  if (legacy.length > 0) {
    const uploads = await db
      .select({ id: documents.id, clientId: documents.clientId, fileName: documents.fileName })
      .from(documents)
      .where(
        and(
          inArray(documents.clientId, [...new Set(legacy.flatMap((r) => (r.clientId ? [r.clientId] : [])))]),
          eq(documents.uploadedByClient, true),
        ),
      )
      .orderBy(desc(documents.createdAt));
    for (const row of legacy) {
      const prefix = PORTAL_UPLOAD_PREFIXES.find((p) => row.title.startsWith(p));
      if (!prefix) continue;
      const fileName = row.title.slice(prefix.length);
      row.documentId = uploads.find((d) => d.clientId === row.clientId && d.fileName === fileName)?.id ?? null;
    }
  }

  const notes =
    rows.length === 0
      ? []
      : await db
          .select({
            id: taskNotes.id,
            taskId: taskNotes.taskId,
            body: taskNotes.body,
            createdAt: taskNotes.createdAt,
            createdByEmail: taskNotes.createdByEmail,
          })
          .from(taskNotes)
          .where(inArray(taskNotes.taskId, rows.map((r) => r.id)))
          .orderBy(asc(taskNotes.createdAt));

  return rows.map((row) => ({
    ...row,
    notes: notes.filter((n) => n.taskId === row.id),
  }));
}

export type TaskBoardRow = Awaited<ReturnType<typeof listTaskBoard>>[number];
