"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { updateAcademyCourseRequirementsAction } from "@/app/[locale]/(app)/academy/courses/actions";

export function CourseRequirementsCard({
  courseId,
  minimumAttendancePercentage,
  minimumOverallGrade,
  requireAllActiveModulesCompleted,
  requireAllEvaluationsGraded,
}: {
  courseId: string;
  minimumAttendancePercentage: number | null;
  minimumOverallGrade: number | null;
  requireAllActiveModulesCompleted: boolean;
  requireAllEvaluationsGraded: boolean;
}) {
  const t = useTranslations("AcademyCourseRequirements");
  const [attendance, setAttendance] = useState(
    minimumAttendancePercentage?.toString() ?? "",
  );
  const [grade, setGrade] = useState(minimumOverallGrade?.toString() ?? "");
  const [allModules, setAllModules] = useState(requireAllActiveModulesCompleted);
  const [allEvaluations, setAllEvaluations] = useState(requireAllEvaluationsGraded);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateAcademyCourseRequirementsAction(courseId, {
        minimumAttendancePercentage: attendance,
        minimumOverallGrade: grade,
        requireAllActiveModulesCompleted: allModules,
        requireAllEvaluationsGraded: allEvaluations,
      });
      toast.success(t("saved"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
      <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="minAttendance">{t("minimumAttendancePercentage")}</Label>
          <Input
            id="minAttendance"
            type="number"
            min={0}
            max={100}
            placeholder={t("notConfigured")}
            value={attendance}
            onChange={(e) => setAttendance(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="minGrade">{t("minimumOverallGrade")}</Label>
          <Input
            id="minGrade"
            type="number"
            min={0}
            max={100}
            placeholder={t("notConfigured")}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox checked={allModules} onCheckedChange={(v) => setAllModules(Boolean(v))} />
        {t("requireAllActiveModulesCompleted")}
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox
          checked={allEvaluations}
          onCheckedChange={(v) => setAllEvaluations(Boolean(v))}
        />
        {t("requireAllEvaluationsGraded")}
      </label>
      <div>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
