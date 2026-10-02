import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listAcademyInstructors } from "@/lib/queries/academyInstructors";
import { AcademySubNav } from "@/components/academy/AcademySubNav";
import { InstructorsManager } from "@/components/academy/InstructorsManager";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function AcademyInstructorsPage() {
  const t = await getTranslations("Academy");
  const configured = isDatabaseConfigured();

  let instructors: Awaited<ReturnType<typeof listAcademyInstructors>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      instructors = await listAcademyInstructors();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
      <AcademySubNav active="instructors" />

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load Academy instructors: {error}.
        </p>
      )}

      {configured && !error && <InstructorsManager instructors={instructors} />}
    </div>
  );
}
