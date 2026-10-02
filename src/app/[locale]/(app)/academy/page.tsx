import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listAcademyEnrollments } from "@/lib/queries/academy";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AcademyTable } from "@/components/academy/AcademyTable";
import { AcademySubNav } from "@/components/academy/AcademySubNav";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import AccessDenied from "@/components/AccessDenied";
import { getCurrentRole, hasAccessArea } from "@/lib/permissions";

// SIDEBAR-PLAN.md follow-up — Academy's own module, showing only
// serviceType "academy" cases (see listAcademyEnrollments), unlike the
// Dashboard's old "View All" which used to send staff to the unfiltered
// /cases list mixed with every other service.
export default async function AcademyPage() {
  const t = await getTranslations("Academy");
  const configured = isDatabaseConfigured();

  // Phase 2H — page-level guard on the Academy module's main entry point.
  const role = await getCurrentRole();
  if (!role || !hasAccessArea(role, "academy")) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <AccessDenied />
      </div>
    );
  }

  let students: Awaited<ReturnType<typeof listAcademyEnrollments>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      students = await listAcademyEnrollments();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <Button
          nativeButton={false}
          render={<Link href="/academy/new-student" />}
        >
          <Plus className="h-4 w-4" />
          {t("newStudent")}
        </Button>
      </div>

      <AcademySubNav active="students" />

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load Academy students: {error}.
        </p>
      )}

      {configured && !error && (
        <>
          {students.length === 0 ? (
            <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <AcademyTable students={students} />
          )}
        </>
      )}
    </div>
  );
}
