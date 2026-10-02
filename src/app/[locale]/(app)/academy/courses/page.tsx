import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listAcademyCourses } from "@/lib/queries/academyCourses";
import { listSelectableAcademyPrograms } from "@/lib/queries/academyPrograms";
import { listAcademyInstructors } from "@/lib/queries/academyInstructors";
import { AcademySubNav } from "@/components/academy/AcademySubNav";
import { CoursesManager } from "@/components/academy/CoursesManager";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function AcademyCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ programId?: string }>;
}) {
  const t = await getTranslations("Academy");
  const configured = isDatabaseConfigured();
  const { programId } = await searchParams;

  let courses: Awaited<ReturnType<typeof listAcademyCourses>> = [];
  let programs: Awaited<ReturnType<typeof listSelectableAcademyPrograms>> = [];
  let instructors: Awaited<ReturnType<typeof listAcademyInstructors>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      [courses, programs, instructors] = await Promise.all([
        listAcademyCourses(),
        listSelectableAcademyPrograms(),
        listAcademyInstructors(),
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
      <AcademySubNav active="courses" />

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load Academy courses: {error}.
        </p>
      )}

      {configured && !error && (
        <CoursesManager
          courses={courses}
          programs={programs}
          instructors={instructors}
          initialProgramFilter={programId}
        />
      )}
    </div>
  );
}
