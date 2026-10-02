"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { academyCatalogStatusValues } from "@/lib/validation/academyProgram";
import { academyCourseFormatValues } from "@/lib/validation/academyCourse";
import {
  createAcademyCourseAction,
  updateAcademyCourseAction,
  updateAcademyCourseStatusAction,
} from "@/app/[locale]/(app)/academy/courses/actions";
import type { listAcademyCourses } from "@/lib/queries/academyCourses";
import type { listSelectableAcademyPrograms } from "@/lib/queries/academyPrograms";
import type { listAcademyInstructors } from "@/lib/queries/academyInstructors";

type Course = Awaited<ReturnType<typeof listAcademyCourses>>[number];
type ProgramOption = Awaited<ReturnType<typeof listSelectableAcademyPrograms>>[number];
type InstructorOption = Awaited<ReturnType<typeof listAcademyInstructors>>[number];
type DialogTarget = "closed" | "new" | Course;

const statusClasses: Record<string, string> = {
  draft: "border-border text-muted-foreground bg-transparent",
  active: "border-transparent bg-primary text-primary-foreground",
  archived: "border-transparent bg-accent/20 text-foreground",
};

export function CoursesManager({
  courses,
  programs,
  instructors,
  initialProgramFilter,
}: {
  courses: Course[];
  programs: ProgramOption[];
  instructors: InstructorOption[];
  initialProgramFilter?: string;
}) {
  const t = useTranslations("AcademyCourses");
  const tStatus = useTranslations("AcademyCatalogStatus");
  const tFormat = useTranslations("CourseFormat");
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<DialogTarget>("closed");
  const [programFilter, setProgramFilter] = useState(initialProgramFilter ?? "all");
  const [statusFilter, setStatusFilter] = useState<"all" | (typeof academyCatalogStatusValues)[number]>(
    "all",
  );

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (programFilter !== "all" && c.programId !== programFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return true;
    });
  }, [courses, programFilter, statusFilter]);

  function setStatus(id: string, status: (typeof academyCatalogStatusValues)[number]) {
    startTransition(async () => {
      await updateAcademyCourseStatusAction(id, status);
      toast.success(t("statusUpdated"));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <Button size="sm" onClick={() => setTarget("new")}>
          <Plus className="h-4 w-4" />
          {t("addCourse")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>{t("filterByProgram")}</Label>
          <Select value={programFilter} onValueChange={(v) => setProgramFilter(v ?? "all")}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allPrograms")}</SelectItem>
              <SelectItem value="none">{t("noProgram")}</SelectItem>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("filterByStatus")}</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as "all" | (typeof academyCatalogStatusValues)[number])
            }
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              {academyCatalogStatusValues.map((s) => (
                <SelectItem key={s} value={s}>
                  {tStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnName")}</TableHead>
                <TableHead>{t("columnProgram")}</TableHead>
                <TableHead>{t("columnFormat")}</TableHead>
                <TableHead>{t("columnInstructor")}</TableHead>
                <TableHead>{t("columnPrice")}</TableHead>
                <TableHead>{t("columnCertificate")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-foreground">
                    <Link
                      href={`/academy/courses/${c.id}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.programName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tFormat(c.format)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.instructorClientName ?? c.instructorName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.price ? `$${c.price}` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.certificateEligible ? "✓" : "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={c.status}
                      onValueChange={(v) =>
                        setStatus(c.id, v as (typeof academyCatalogStatusValues)[number])
                      }
                    >
                      <SelectTrigger className="h-7 w-28" disabled={isPending}>
                        <SelectValue>
                          <Badge className={cn(statusClasses[c.status])}>
                            {tStatus(c.status)}
                          </Badge>
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
                  </TableCell>
                  <TableCell>
                    <Button size="icon-sm" variant="ghost" onClick={() => setTarget(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CourseFormDialog
        key={target === "new" || target === "closed" ? target : target.id}
        target={target}
        programs={programs}
        instructors={instructors}
        onOpenChange={(open) => {
          if (!open) setTarget("closed");
        }}
      />
    </div>
  );
}

function CourseFormDialog({
  target,
  programs,
  instructors,
  onOpenChange,
}: {
  target: DialogTarget;
  programs: ProgramOption[];
  instructors: InstructorOption[];
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("AcademyCourses");
  const tStatus = useTranslations("AcademyCatalogStatus");
  const tFormat = useTranslations("CourseFormat");
  const course = target === "new" || target === "closed" ? undefined : target;
  const isEdit = Boolean(course);
  const open = target !== "closed";

  const [programId, setProgramId] = useState(course?.programId ?? "");
  const [name, setName] = useState(course?.name ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [format, setFormat] = useState<(typeof academyCourseFormatValues)[number]>(
    course?.format ?? "live",
  );
  const [status, setStatus] = useState<(typeof academyCatalogStatusValues)[number]>(
    course?.status ?? "draft",
  );
  const [durationText, setDurationText] = useState(course?.durationText ?? "");
  const [price, setPrice] = useState(course?.price ?? "");
  const [certificateEligible, setCertificateEligible] = useState(
    course?.certificateEligible ?? false,
  );
  const [primaryInstructorId, setPrimaryInstructorId] = useState(
    course?.primaryInstructorId ?? "",
  );
  const [notes, setNotes] = useState(course?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const values = {
        programId,
        name,
        description,
        format,
        status,
        durationText,
        price,
        certificateEligible,
        primaryInstructorId,
        notes,
      };
      if (isEdit && course) {
        await updateAcademyCourseAction(course.id, values);
      } else {
        await createAcademyCourseAction(values);
      }
      toast.success(isEdit ? t("courseUpdated") : t("courseAdded"));
      onOpenChange(false);
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("editCourse") : t("addCourse")}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="courseName">{t("name")}</Label>
            <Input id="courseName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("program")}</Label>
            <Select
              value={programId || "none"}
              onValueChange={(v) => setProgramId(!v || v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("standaloneCourse")}</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="courseDescription">{t("description")}</Label>
            <Textarea
              id="courseDescription"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>{t("format")}</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as (typeof academyCourseFormatValues)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academyCourseFormatValues.map((f) => (
                    <SelectItem key={f} value={f}>
                      {tFormat(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Label>{t("primaryInstructor")}</Label>
            <Select
              value={primaryInstructorId || "none"}
              onValueChange={(v) => setPrimaryInstructorId(!v || v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("noInstructor")}</SelectItem>
                {instructors.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.clientName ?? i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="courseDuration">{t("duration")}</Label>
              <Input
                id="courseDuration"
                value={durationText}
                onChange={(e) => setDurationText(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coursePrice">{t("price")}</Label>
              <Input
                id="coursePrice"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t("priceHint")}</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={certificateEligible}
              onCheckedChange={(v) => setCertificateEligible(Boolean(v))}
            />
            {t("certificateEligible")}
          </label>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="courseNotes">{t("notes")}</Label>
            <Textarea
              id="courseNotes"
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
