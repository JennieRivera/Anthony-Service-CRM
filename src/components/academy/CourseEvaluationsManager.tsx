"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { academyCatalogStatusValues } from "@/lib/validation/academyProgram";
import { academyEvaluationTypeValues } from "@/lib/validation/academyEvaluation";
import { academyEvaluationResultStatusValues } from "@/lib/validation/academyEvaluationResult";
import {
  createAcademyEvaluationAction,
  updateAcademyEvaluationAction,
  updateAcademyEvaluationStatusAction,
  getEvaluationRosterAction,
  gradeStudentAction,
} from "@/app/[locale]/(app)/academy/courses/actions";
import type { listEvaluationsForCourse } from "@/lib/queries/academyEvaluations";
import type { listResultsForEvaluation } from "@/lib/queries/academyEvaluationResults";

type Evaluation = Awaited<ReturnType<typeof listEvaluationsForCourse>>[number];
type RosterEntry = Awaited<ReturnType<typeof listResultsForEvaluation>>[number];
type EvalDialogTarget = "closed" | "new" | Evaluation;

const statusClasses: Record<string, string> = {
  draft: "border-border text-muted-foreground bg-transparent",
  active: "border-transparent bg-primary text-primary-foreground",
  archived: "border-transparent bg-accent/20 text-foreground",
};

const resultStatusClasses: Record<string, string> = {
  not_submitted: "border-border text-muted-foreground bg-transparent",
  submitted: "border-transparent bg-info text-info-foreground",
  graded: "border-transparent bg-success text-success-foreground",
  excused: "border-border text-muted-foreground bg-transparent",
};

export function CourseEvaluationsManager({
  courseId,
  modules,
  evaluations,
}: {
  courseId: string;
  modules: { id: string; title: string }[];
  evaluations: Evaluation[];
}) {
  const t = useTranslations("AcademyEvaluations");
  const tType = useTranslations("AcademyEvaluationType");
  const tStatus = useTranslations("AcademyCatalogStatus");
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<EvalDialogTarget>("closed");
  const [rosterEvaluation, setRosterEvaluation] = useState<Evaluation | null>(null);

  function setStatus(id: string, status: (typeof academyCatalogStatusValues)[number]) {
    startTransition(async () => {
      try {
        await updateAcademyEvaluationStatusAction(courseId, id, status);
        toast.success(t("statusUpdated"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("saveError"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        <Button size="sm" onClick={() => setTarget("new")}>
          <Plus className="h-4 w-4" />
          {t("addEvaluation")}
        </Button>
      </div>

      {evaluations.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {evaluations.map((e) => (
            <div
              key={e.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{e.title}</span>
                  <Badge variant="outline">{tType(e.evaluationType)}</Badge>
                  {e.moduleTitle && (
                    <span className="text-xs text-muted-foreground">
                      {t("module")}: {e.moduleTitle}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {t("maxPoints")}: {e.maxPoints}
                  {e.passingScore != null ? ` · ${t("passingScore")}: ${e.passingScore}%` : ""}
                  {e.weightPercentage != null ? ` · ${t("weight")}: ${e.weightPercentage}%` : ""}
                  {e.dueDate ? ` · ${formatDate(e.dueDate)}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={e.status}
                  onValueChange={(v) =>
                    setStatus(e.id, v as (typeof academyCatalogStatusValues)[number])
                  }
                >
                  <SelectTrigger className="h-7 w-28" disabled={isPending}>
                    <SelectValue>
                      <Badge className={cn(statusClasses[e.status])}>{tStatus(e.status)}</Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {academyCatalogStatusValues.map((status) => (
                      <SelectItem key={status} value={status}>
                        {tStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => setRosterEvaluation(e)}>
                  <Users className="h-3.5 w-3.5" />
                  {t("gradeStudents")}
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => setTarget(e)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EvaluationFormDialog
        key={`eval-${target === "new" || target === "closed" ? target : target.id}`}
        courseId={courseId}
        modules={modules}
        target={target}
        onOpenChange={(open) => {
          if (!open) setTarget("closed");
        }}
      />

      <GradeRosterDialog
        key={`roster-${rosterEvaluation?.id ?? "closed"}`}
        courseId={courseId}
        evaluation={rosterEvaluation}
        onOpenChange={(open) => {
          if (!open) setRosterEvaluation(null);
        }}
      />
    </div>
  );
}

function EvaluationFormDialog({
  courseId,
  modules,
  target,
  onOpenChange,
}: {
  courseId: string;
  modules: { id: string; title: string }[];
  target: EvalDialogTarget;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("AcademyEvaluations");
  const tType = useTranslations("AcademyEvaluationType");
  const tStatus = useTranslations("AcademyCatalogStatus");
  const evaluation = target === "new" || target === "closed" ? undefined : target;
  const isEdit = Boolean(evaluation);
  const open = target !== "closed";

  const [moduleId, setModuleId] = useState(evaluation?.moduleId ?? "");
  const [title, setTitle] = useState(evaluation?.title ?? "");
  const [description, setDescription] = useState(evaluation?.description ?? "");
  const [evaluationType, setEvaluationType] = useState<
    (typeof academyEvaluationTypeValues)[number]
  >(evaluation?.evaluationType ?? "other");
  const [maxPoints, setMaxPoints] = useState(evaluation?.maxPoints?.toString() ?? "100");
  const [passingScore, setPassingScore] = useState(evaluation?.passingScore?.toString() ?? "");
  const [weightPercentage, setWeightPercentage] = useState(
    evaluation?.weightPercentage?.toString() ?? "",
  );
  const [status, setStatus] = useState<(typeof academyCatalogStatusValues)[number]>(
    evaluation?.status ?? "draft",
  );
  const [dueDate, setDueDate] = useState(evaluation?.dueDate ?? "");
  const [notes, setNotes] = useState(evaluation?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const values = {
        moduleId,
        title,
        description,
        evaluationType,
        maxPoints,
        passingScore,
        weightPercentage,
        status,
        dueDate,
        notes,
      };
      if (isEdit && evaluation) {
        await updateAcademyEvaluationAction(courseId, evaluation.id, values);
      } else {
        await createAcademyEvaluationAction(courseId, values);
      }
      toast.success(isEdit ? t("evaluationUpdated") : t("evaluationAdded"));
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editEvaluation") : t("addEvaluation")}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="evaluationTitle">{t("evaluationTitle")}</Label>
            <Input id="evaluationTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="evaluationDescription">{t("description")}</Label>
            <Textarea
              id="evaluationDescription"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("evaluationType")}</Label>
              <Select
                value={evaluationType}
                onValueChange={(v) =>
                  setEvaluationType(v as (typeof academyEvaluationTypeValues)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academyEvaluationTypeValues.map((v) => (
                    <SelectItem key={v} value={v}>
                      {tType(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("module")}</Label>
              <Select
                value={moduleId || "none"}
                onValueChange={(v) => setModuleId(!v || v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("courseWide")}</SelectItem>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maxPoints">{t("maxPoints")}</Label>
              <Input
                id="maxPoints"
                type="number"
                min={1}
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="passingScore">{t("passingScore")}</Label>
              <Input
                id="passingScore"
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weightPercentage">{t("weight")}</Label>
              <Input
                id="weightPercentage"
                type="number"
                min={0}
                max={100}
                value={weightPercentage}
                onChange={(e) => setWeightPercentage(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="evaluationDueDate">{t("dueDate")}</Label>
              <Input
                id="evaluationDueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("columnStatus")}</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as (typeof academyCatalogStatusValues)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academyCatalogStatusValues.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tStatus(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="evaluationNotes">{t("notes")}</Label>
            <Textarea
              id="evaluationNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GradeRosterDialog({
  courseId,
  evaluation,
  onOpenChange,
}: {
  courseId: string;
  evaluation: Evaluation | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("AcademyEvaluations");
  const tResultStatus = useTranslations("AcademyEvaluationResultStatus");
  const open = evaluation !== null;
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function loadRoster() {
    if (!evaluation) return;
    setLoading(true);
    try {
      const data = await getEvaluationRosterAction(evaluation.id, courseId);
      setRoster(data);
    } finally {
      setLoading(false);
    }
  }

  // Same reasoning as CourseAttendanceManager's RosterDialog: this
  // component remounts per evaluation via its key, so a mount-time effect
  // reliably loads the right roster — Base UI's onOpenChange only fires on
  // dialog-internal interactions, never when `open` is set externally.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function grade(
    enrollmentCaseId: string,
    clientId: string,
    pointsEarned: string,
    status: (typeof academyEvaluationResultStatusValues)[number],
    feedback: string,
  ) {
    if (!evaluation) return;
    startTransition(async () => {
      await gradeStudentAction(
        courseId,
        evaluation.id,
        enrollmentCaseId,
        clientId,
        evaluation.maxPoints,
        { pointsEarned, status, notes: "", feedback },
      );
      setRoster((prev) =>
        prev
          ? prev.map((r) =>
              r.enrollmentCaseId === enrollmentCaseId
                ? {
                    ...r,
                    pointsEarned: pointsEarned === "" ? null : Number(pointsEarned),
                    status,
                    feedback: feedback || null,
                  }
                : r,
            )
          : prev,
      );
      toast.success(t("resultSaved"));
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("gradeStudents")}
            {evaluation ? ` — ${evaluation.title}` : ""}
          </DialogTitle>
        </DialogHeader>
        {loading && <p className="text-sm text-muted-foreground">{t("loading")}</p>}
        {!loading && roster && roster.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noEnrolledStudents")}</p>
        )}
        {!loading && roster && roster.length > 0 && (
          <div className="flex flex-col gap-3">
            {roster.map((r) => (
              <RosterRow
                key={r.enrollmentCaseId}
                entry={r}
                maxPoints={evaluation?.maxPoints ?? 0}
                isPending={isPending}
                tResultStatus={tResultStatus}
                pointsLabel={t("points")}
                feedbackLabel={t("feedback")}
                saveLabel={t("save")}
                onSave={(pointsEarned, status, feedback) =>
                  grade(r.enrollmentCaseId, r.clientId, pointsEarned, status, feedback)
                }
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RosterRow({
  entry,
  maxPoints,
  isPending,
  tResultStatus,
  pointsLabel,
  feedbackLabel,
  saveLabel,
  onSave,
}: {
  entry: RosterEntry;
  maxPoints: number;
  isPending: boolean;
  tResultStatus: (key: string) => string;
  pointsLabel: string;
  feedbackLabel: string;
  saveLabel: string;
  onSave: (
    pointsEarned: string,
    status: (typeof academyEvaluationResultStatusValues)[number],
    feedback: string,
  ) => void;
}) {
  const [pointsEarned, setPointsEarned] = useState(entry.pointsEarned?.toString() ?? "");
  const [status, setStatus] = useState<(typeof academyEvaluationResultStatusValues)[number]>(
    entry.status as (typeof academyEvaluationResultStatusValues)[number],
  );
  const [feedback, setFeedback] = useState(entry.feedback ?? "");

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-2">
      <span className="text-sm font-medium text-foreground">{entry.clientName}</span>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min={0}
          max={maxPoints}
          className="h-7 w-20"
          value={pointsEarned}
          disabled={isPending}
          onChange={(e) => setPointsEarned(e.target.value)}
        />
        <span className="text-xs text-muted-foreground">
          / {maxPoints} {pointsLabel}
        </span>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as (typeof academyEvaluationResultStatusValues)[number])}
        >
          <SelectTrigger className="h-7 w-32" disabled={isPending}>
            <SelectValue>
              <Badge className={cn(resultStatusClasses[status])}>{tResultStatus(status)}</Badge>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {academyEvaluationResultStatusValues.map((s) => (
              <SelectItem key={s} value={s}>
                {tResultStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        placeholder={feedbackLabel}
        className="h-7"
        value={feedback}
        disabled={isPending}
        onChange={(e) => setFeedback(e.target.value)}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => onSave(pointsEarned, status, feedback)}
      >
        {saveLabel}
      </Button>
    </div>
  );
}
