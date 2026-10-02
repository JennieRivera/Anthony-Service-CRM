import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/dates";
import type { listEvaluationsWithResultForEnrollment } from "@/lib/queries/academyEvaluationResults";

const resultStatusClasses: Record<string, string> = {
  not_submitted: "border-border text-muted-foreground bg-transparent",
  submitted: "border-transparent bg-info text-info-foreground",
  graded: "border-transparent bg-success text-success-foreground",
  excused: "border-border text-muted-foreground bg-transparent",
};

const passClasses: Record<string, string> = {
  passed: "border-transparent bg-success text-success-foreground",
  not_passed: "border-transparent bg-premium/20 text-foreground",
};

export async function EnrollmentEvaluationsSection({
  evaluations,
  gradedCount,
  totalActive,
  overallGrade,
  provisional,
  requirements,
}: {
  evaluations: Awaited<ReturnType<typeof listEvaluationsWithResultForEnrollment>>;
  gradedCount: number;
  totalActive: number;
  overallGrade: number | null;
  provisional: boolean;
  requirements: {
    minimumAttendance: boolean | null;
    minimumGrade: boolean | null;
    allModulesCompleted: boolean | null;
    allEvaluationsGraded: boolean | null;
  };
}) {
  const t = await getTranslations("AcademyEvaluations");
  const tType = await getTranslations("AcademyEvaluationType");
  const tResultStatus = await getTranslations("AcademyEvaluationResultStatus");
  const tGrade = await getTranslations("AcademyGrade");

  const requirementEntries: { key: string; label: string; met: boolean | null }[] = [
    { key: "minimumAttendance", label: tGrade("minimumAttendance"), met: requirements.minimumAttendance },
    { key: "minimumGrade", label: tGrade("minimumGrade"), met: requirements.minimumGrade },
    {
      key: "allModulesCompleted",
      label: tGrade("allModulesCompleted"),
      met: requirements.allModulesCompleted,
    },
    {
      key: "allEvaluationsGraded",
      label: tGrade("allEvaluationsGraded"),
      met: requirements.allEvaluationsGraded,
    },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        <div className="flex items-center gap-2">
          <span className="font-heading text-2xl text-foreground">
            {overallGrade != null ? `${overallGrade}%` : "—"}
          </span>
          {provisional && (
            <Badge className="border-transparent bg-premium/20 text-foreground">
              {tGrade("provisional")}
            </Badge>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {tGrade("evaluationsCompletedCount", { graded: gradedCount, total: totalActive })}
      </p>
      {provisional && (
        <p className="text-sm text-muted-foreground">{tGrade("provisionalWarning")}</p>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        {requirementEntries.map((r) => (
          <span key={r.key} className="text-foreground">
            {r.label}:{" "}
            <span className="font-medium">
              {r.met == null ? tGrade("notConfigured") : r.met ? tGrade("met") : tGrade("notMet")}
            </span>
          </span>
        ))}
      </div>

      {evaluations.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t("noActiveEvaluations")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {evaluations.map((e) => (
            <div key={e.evaluationId} className="flex flex-col gap-1 rounded-md border border-border p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">{e.title}</span>
                <Badge variant="outline">{tType(e.evaluationType)}</Badge>
                {e.moduleTitle && (
                  <span className="text-xs text-muted-foreground">
                    {t("module")}: {e.moduleTitle}
                  </span>
                )}
                <Badge className={cn(resultStatusClasses[e.status])}>
                  {tResultStatus(e.status)}
                </Badge>
                {e.passStatus && (
                  <Badge className={cn(passClasses[e.passStatus])}>
                    {tGrade(e.passStatus === "passed" ? "passed" : "notPassed")}
                  </Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {e.pointsEarned != null
                  ? `${e.pointsEarned} / ${e.maxPoints} (${e.percentageScore}%)`
                  : `${t("maxPoints")}: ${e.maxPoints}`}
                {e.gradedAt ? ` · ${tGrade("graded")} ${formatDateTime(e.gradedAt)}` : ""}
              </span>
              {e.feedback && (
                <p className="text-xs text-foreground">
                  {tGrade("feedback")}: {e.feedback}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
