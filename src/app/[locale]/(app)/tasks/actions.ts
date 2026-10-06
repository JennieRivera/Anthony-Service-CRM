"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { taskNotes, tasks } from "@/lib/db/schema";
import { addDays, businessDateString } from "@/lib/dates";
import { requireAuthenticatedUser } from "@/lib/permissions";

export async function markTaskDoneAction(id: string) {
  await requireAuthenticatedUser();
  const db = getDb();
  await db
    .update(tasks)
    .set({ status: "done", completedAt: new Date() })
    .where(eq(tasks.id, id));

  revalidatePath("/tasks");
}

const taskId = z.string().uuid();
const dueDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Detail panel on /tasks: set or clear the due date.
export async function updateTaskDueDateAction(id: string, value: string | null) {
  await requireAuthenticatedUser();
  const parsedId = taskId.parse(id);
  const parsedDate = value ? dueDate.parse(value) : null;
  await getDb().update(tasks).set({ dueDate: parsedDate }).where(eq(tasks.id, parsedId));
  revalidatePath("/tasks");
}

// "Postpone": tomorrow / in 3 days / in 1 week, counted from today
// (Florida business date).
export async function postponeTaskAction(id: string, days: number) {
  await requireAuthenticatedUser();
  const parsedId = taskId.parse(id);
  const parsedDays = z.union([z.literal(1), z.literal(3), z.literal(7)]).parse(days);
  const next = addDays(businessDateString(), parsedDays);
  await getDb().update(tasks).set({ dueDate: next }).where(eq(tasks.id, parsedId));
  revalidatePath("/tasks");
  return next;
}

export async function addTaskNoteAction(id: string, body: string) {
  await requireAuthenticatedUser();
  const parsedId = taskId.parse(id);
  const text = z.string().trim().min(1).max(2000).parse(body);
  const email = (await auth())?.user?.email ?? null;
  await getDb().insert(taskNotes).values({ taskId: parsedId, body: text, createdByEmail: email });
  revalidatePath("/tasks");
}
