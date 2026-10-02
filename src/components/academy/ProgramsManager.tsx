"use client";

import { useState, useTransition } from "react";
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
import {
  createAcademyProgramAction,
  updateAcademyProgramAction,
  updateAcademyProgramStatusAction,
} from "@/app/[locale]/(app)/academy/programs/actions";
import type { listAcademyPrograms } from "@/lib/queries/academyPrograms";

type Program = Awaited<ReturnType<typeof listAcademyPrograms>>[number];
type DialogTarget = "closed" | "new" | Program;

const statusClasses: Record<string, string> = {
  draft: "border-border text-muted-foreground bg-transparent",
  active: "border-transparent bg-primary text-primary-foreground",
  archived: "border-transparent bg-accent/20 text-foreground",
};

export function ProgramsManager({
  programs,
  courseCounts,
}: {
  programs: Program[];
  courseCounts: Record<string, number>;
}) {
  const t = useTranslations("AcademyPrograms");
  const tStatus = useTranslations("AcademyCatalogStatus");
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<DialogTarget>("closed");

  function setStatus(id: string, status: (typeof academyCatalogStatusValues)[number]) {
    startTransition(async () => {
      await updateAcademyProgramStatusAction(id, status);
      toast.success(t("statusUpdated"));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <Button size="sm" onClick={() => setTarget("new")}>
          <Plus className="h-4 w-4" />
          {t("addProgram")}
        </Button>
      </div>

      {programs.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnName")}</TableHead>
                <TableHead>{t("columnDuration")}</TableHead>
                <TableHead>{t("columnCourses")}</TableHead>
                <TableHead>{t("columnCertificate")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.durationText ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <Link
                      href={`/academy/courses?programId=${p.id}`}
                      className="underline hover:text-foreground"
                    >
                      {t("viewCourses", { count: courseCounts[p.id] ?? 0 })}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.certificateEligible ? "✓" : "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={p.status}
                      onValueChange={(v) =>
                        setStatus(p.id, v as (typeof academyCatalogStatusValues)[number])
                      }
                    >
                      <SelectTrigger className="h-7 w-28" disabled={isPending}>
                        <SelectValue>
                          <Badge className={cn(statusClasses[p.status])}>
                            {tStatus(p.status)}
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
                    <Button size="icon-sm" variant="ghost" onClick={() => setTarget(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProgramFormDialog
        key={target === "new" || target === "closed" ? target : target.id}
        target={target}
        onOpenChange={(open) => {
          if (!open) setTarget("closed");
        }}
      />
    </div>
  );
}

function ProgramFormDialog({
  target,
  onOpenChange,
}: {
  target: DialogTarget;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("AcademyPrograms");
  const tStatus = useTranslations("AcademyCatalogStatus");
  const program = target === "new" || target === "closed" ? undefined : target;
  const isEdit = Boolean(program);
  const open = target !== "closed";

  const [name, setName] = useState(program?.name ?? "");
  const [description, setDescription] = useState(program?.description ?? "");
  const [status, setStatus] = useState<(typeof academyCatalogStatusValues)[number]>(
    program?.status ?? "draft",
  );
  const [startDate, setStartDate] = useState(program?.startDate ?? "");
  const [endDate, setEndDate] = useState(program?.endDate ?? "");
  const [durationText, setDurationText] = useState(program?.durationText ?? "");
  const [certificateEligible, setCertificateEligible] = useState(
    program?.certificateEligible ?? false,
  );
  const [notes, setNotes] = useState(program?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const values = {
        name,
        description,
        status,
        startDate,
        endDate,
        durationText,
        certificateEligible,
        notes,
      };
      if (isEdit && program) {
        await updateAcademyProgramAction(program.id, values);
      } else {
        await createAcademyProgramAction(values);
      }
      toast.success(isEdit ? t("programUpdated") : t("programAdded"));
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
          <DialogTitle>{isEdit ? t("editProgram") : t("addProgram")}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="programName">{t("name")}</Label>
            <Input id="programName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="programDescription">{t("description")}</Label>
            <Textarea
              id="programDescription"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="programStartDate">{t("startDate")}</Label>
              <Input
                id="programStartDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="programEndDate">{t("endDate")}</Label>
              <Input
                id="programEndDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="programDuration">{t("duration")}</Label>
              <Input
                id="programDuration"
                value={durationText}
                onChange={(e) => setDurationText(e.target.value)}
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

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={certificateEligible}
              onCheckedChange={(v) => setCertificateEligible(Boolean(v))}
            />
            {t("certificateEligible")}
          </label>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="programNotes">{t("notes")}</Label>
            <Textarea
              id="programNotes"
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
