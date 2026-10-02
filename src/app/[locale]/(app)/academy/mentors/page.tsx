import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listAcademyMentors } from "@/lib/queries/academyMentors";
import { AcademySubNav } from "@/components/academy/AcademySubNav";
import { MentorsManager } from "@/components/academy/MentorsManager";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function AcademyMentorsPage() {
  const t = await getTranslations("Academy");
  const configured = isDatabaseConfigured();

  let mentors: Awaited<ReturnType<typeof listAcademyMentors>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      mentors = await listAcademyMentors();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
      <AcademySubNav active="mentors" />

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load Academy mentors: {error}.
        </p>
      )}

      {configured && !error && <MentorsManager mentors={mentors} />}
    </div>
  );
}
