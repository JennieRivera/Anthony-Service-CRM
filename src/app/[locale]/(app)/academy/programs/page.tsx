import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listAcademyPrograms } from "@/lib/queries/academyPrograms";
import { listAcademyCourses } from "@/lib/queries/academyCourses";
import { AcademySubNav } from "@/components/academy/AcademySubNav";
import { ProgramsManager } from "@/components/academy/ProgramsManager";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function AcademyProgramsPage() {
  const t = await getTranslations("Academy");
  const configured = isDatabaseConfigured();

  let programs: Awaited<ReturnType<typeof listAcademyPrograms>> = [];
  let courseCounts: Record<string, number> = {};
  let error: string | null = null;

  if (configured) {
    try {
      const [programRows, courseRows] = await Promise.all([
        listAcademyPrograms(),
        listAcademyCourses(),
      ]);
      programs = programRows;
      courseCounts = courseRows.reduce<Record<string, number>>((acc, c) => {
        if (c.programId) acc[c.programId] = (acc[c.programId] ?? 0) + 1;
        return acc;
      }, {});
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
      <AcademySubNav active="programs" />

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load Academy programs: {error}.
        </p>
      )}

      {configured && !error && (
        <ProgramsManager programs={programs} courseCounts={courseCounts} />
      )}
    </div>
  );
}
