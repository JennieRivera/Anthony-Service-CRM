import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { academyCourseModules } from "@/lib/db/schema";
import type { AcademyCourseModuleFormValues } from "@/lib/validation/academyCourseModule";

export async function listModulesForCourse(courseId: string) {
  return getDb()
    .select()
    .from(academyCourseModules)
    .where(eq(academyCourseModules.courseId, courseId))
    .orderBy(asc(academyCourseModules.moduleOrder));
}

export async function createAcademyCourseModule(
  courseId: string,
  values: AcademyCourseModuleFormValues,
) {
  const db = getDb();
  const existing = await db
    .select({ moduleOrder: academyCourseModules.moduleOrder })
    .from(academyCourseModules)
    .where(eq(academyCourseModules.courseId, courseId))
    .orderBy(asc(academyCourseModules.moduleOrder));
  const nextOrder = existing.length
    ? Math.max(...existing.map((m) => m.moduleOrder)) + 1
    : 0;

  await db.insert(academyCourseModules).values({
    courseId,
    title: values.title,
    description: values.description || null,
    moduleOrder: nextOrder,
    durationText: values.durationText || null,
    status: values.status,
  });
}

export async function updateAcademyCourseModule(
  id: string,
  values: AcademyCourseModuleFormValues,
) {
  await getDb()
    .update(academyCourseModules)
    .set({
      title: values.title,
      description: values.description || null,
      durationText: values.durationText || null,
      status: values.status,
      updatedAt: new Date(),
    })
    .where(eq(academyCourseModules.id, id));
}

export async function updateAcademyCourseModuleStatus(
  id: string,
  status: AcademyCourseModuleFormValues["status"],
) {
  await getDb()
    .update(academyCourseModules)
    .set({ status, updatedAt: new Date() })
    .where(eq(academyCourseModules.id, id));
}

// Same adjacent-swap pattern as reorderProfessionalSystemAction
// (professional-systems/actions.ts) — simple, safe, no drag-and-drop
// state to get wrong.
export async function reorderAcademyCourseModule(
  courseId: string,
  id: string,
  direction: "up" | "down",
) {
  const db = getDb();
  const rows = await db
    .select({ id: academyCourseModules.id, moduleOrder: academyCourseModules.moduleOrder })
    .from(academyCourseModules)
    .where(eq(academyCourseModules.courseId, courseId))
    .orderBy(asc(academyCourseModules.moduleOrder));

  const index = rows.findIndex((r) => r.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= rows.length) return;

  const current = rows[index];
  const swapWith = rows[swapIndex];

  await Promise.all([
    db
      .update(academyCourseModules)
      .set({ moduleOrder: swapWith.moduleOrder })
      .where(eq(academyCourseModules.id, current.id)),
    db
      .update(academyCourseModules)
      .set({ moduleOrder: current.moduleOrder })
      .where(eq(academyCourseModules.id, swapWith.id)),
  ]);
}
