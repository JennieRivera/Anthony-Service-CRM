import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getAcademyCourseById } from "@/lib/queries/academyCourses";
import { listModulesForCourse } from "@/lib/queries/academyCourseModules";
import { CourseModulesManager } from "@/components/academy/CourseModulesManager";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function AcademyCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("AcademyCourses");
  const tFormat = await getTranslations("CourseFormat");
  const configured = isDatabaseConfigured();

  if (!configured) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <DatabaseNotConfigured />
      </div>
    );
  }

  const course = await getAcademyCourseById(id);
  if (!course) notFound();

  const modules = await listModulesForCourse(id);

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">{course.name}</h1>
        <Link href="/academy/courses" className="text-sm text-muted-foreground underline">
          &larr; {t("backToCourses")}
        </Link>
      </div>

      <div className="grid gap-4 rounded-lg border border-border bg-card p-6 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">{t("program")}</p>
          <p className="text-foreground">{course.programName ?? t("standaloneCourse")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("format")}</p>
          <p className="text-foreground">{tFormat(course.format)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("primaryInstructor")}</p>
          <p className="text-foreground">
            {course.instructorClientName ?? course.instructorName ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("price")}</p>
          <p className="text-foreground">{course.price ? `$${course.price}` : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("certificateEligible")}</p>
          <p className="text-foreground">{course.certificateEligible ? "✓" : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{t("columnStatus")}</p>
          <p className="text-foreground">{course.status}</p>
        </div>
      </div>

      <CourseModulesManager courseId={id} modules={modules} />
    </div>
  );
}
