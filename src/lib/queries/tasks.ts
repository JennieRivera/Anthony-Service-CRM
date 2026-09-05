import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tasks, clients, cases } from "@/lib/db/schema";

export async function listOpenTasks() {
  return getDb()
    .select({
      id: tasks.id,
      type: tasks.type,
      title: tasks.title,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      clientId: clients.id,
      clientName: clients.fullName,
      caseId: cases.id,
      caseTitle: cases.title,
    })
    .from(tasks)
    .innerJoin(clients, eq(tasks.clientId, clients.id))
    .leftJoin(cases, eq(tasks.caseId, cases.id))
    .where(eq(tasks.status, "open"))
    .orderBy(asc(tasks.dueDate));
}
