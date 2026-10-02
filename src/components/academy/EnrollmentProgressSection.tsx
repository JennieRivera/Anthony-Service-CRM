"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { academyModuleProgressStatusValues } from "@/lib/validation/academyModuleProgress";
import { markModuleProgressAction } from "@/app/[locale]/(app)/cases/actions";

const progressStatusClasses: Record<string, string> = {
  not_started: "border-border text-muted-foreground bg-transparent",
  in_progress: "border-transparent bg-info text-info-foreground",
  completed: "border-transparent bg-success text-success-foreground",
};

type ModuleProgress = {
  moduleId: string;
  title: string;
  order: number;
  status: "not_started" | "in_progress" | "completed";
  completedAt: Date | string | null;
};

export function EnrollmentProgressSection({
  enrollmentCaseId,
  courseId,
  clientId,
  courseName,
  programName,
  instructorName,
  completedCount,
  totalCount,
  percentage,
  modules,
}: {
  enrollmentCaseId: string;
  courseId: string;
  clientId: string;
  courseName: string;
  programName: string | null;
  instructorName: string | null;
  completedCount: number;
  totalCount: number;
  percentage: number | null;
  modules: ModuleProgress[];
}) {
  const t = useTranslations("AcademyProgress");
  const tStatus = useTranslations("AcademyModuleProgressStatus");
  const [isPending, startTransition] = useTransition();

  function mark(moduleId: string, status: (typeof academyModuleProgressStatusValues)[number]) {
    startTransition(async () => {
      await markModuleProgressAction(enrollmentCaseId, courseId, moduleId, clientId, {
        status,
        notes: "",
      });
      toast.success(t("progressUpdated"));
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {courseName}
            {programName ? ` · ${programName}` : ""}
            {instructorName ? ` · ${t("instructor")}: ${instructorName}` : ""}
          </p>
        </div>
        <span className="font-heading text-2xl text-foreground">
          {percentage != null ? `${percentage}%` : "—"}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage ?? 0}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {t("modulesCompletedCount", { completed: completedCount, total: totalCount })}
      </p>

      {totalCount === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t("noActiveModules")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {modules.map((m) => (
            <div
              key={m.moduleId}
              className="flex items-center gap-3 rounded-md border border-border p-2.5"
            >
              <div className="flex flex-1 flex-col">
                <span className="text-sm font-medium text-foreground">
                  {m.order}. {m.title}
                </span>
                {m.status === "completed" && m.completedAt && (
                  <span className="text-xs text-muted-foreground">
                    {t("completedOn", { date: formatDate(m.completedAt) })}
                  </span>
                )}
              </div>
              <Select
                value={m.status}
                onValueChange={(v) =>
                  mark(m.moduleId, v as (typeof academyModuleProgressStatusValues)[number])
                }
              >
                <SelectTrigger className="h-7 w-36" disabled={isPending}>
                  <SelectValue>
                    <Badge className={cn(progressStatusClasses[m.status])}>
                      {tStatus(m.status)}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {academyModuleProgressStatusValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {tStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
