"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
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
