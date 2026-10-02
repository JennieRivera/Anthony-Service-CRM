"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Pencil, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
import {
  createAcademyCourseModuleAction,
  updateAcademyCourseModuleAction,
  updateAcademyCourseModuleStatusAction,
  reorderAcademyCourseModuleAction,
} from "@/app/[locale]/(app)/academy/courses/actions";
import type { listModulesForCourse } from "@/lib/queries/academyCourseModules";

type Module = Awaited<ReturnType<typeof listModulesForCourse>>[number];
type DialogTarget = "closed" | "new" | Module;

const statusClasses: Record<string, string> = {
  draft: "border-border text-muted-foreground bg-transparent",
  active: "border-transparent bg-primary text-primary-foreground",
  archived: "border-transparent bg-accent/20 text-foreground",
};

export function CourseModulesManager({
  courseId,
  modules,
}: {
  courseId: string;
  modules: Module[];
}) {
  const t = useTranslations("AcademyCourseModules");
  const tStatus = useTranslations("AcademyCatalogStatus");
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<DialogTarget>("closed");

  function setStatus(id: string, status: (typeof academyCatalogStatusValues)[number]) {
    startTransition(async () => {
      await updateAcademyCourseModuleStatusAction(courseId, id, status);
      toast.success(t("statusUpdated"));
    });
  }

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      await reorderAcademyCourseModuleAction(courseId, id, direction);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        <Button size="sm" onClick={() => setTarget("new")}>
          <Plus className="h-4 w-4" />
          {t("addModule")}
        </Button>
      </div>

      {modules.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {modules.map((m, index) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex flex-col">
                <Button
                  size="icon-xs"
                  variant="ghost"
                  disabled={isPending || index === 0}
                  onClick={() => move(m.id, "up")}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  disabled={isPending || index === modules.length - 1}
                  onClick={() => move(m.id, "down")}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-1 flex-col">
                <span className="font-medium text-foreground">
                  {index + 1}. {m.title}
                </span>
                {m.durationText && (
                  <span className="text-xs text-muted-foreground">{m.durationText}</span>
                )}
              </div>
              <Select
                value={m.status}
                onValueChange={(v) =>
                  setStatus(m.id, v as (typeof academyCatalogStatusValues)[number])
                }
              >
                <SelectTrigger className="h-7 w-28" disabled={isPending}>
                  <SelectValue>
                    <Badge className={cn(statusClasses[m.status])}>{tStatus(m.status)}</Badge>
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
              <Button size="icon-sm" variant="ghost" onClick={() => setTarget(m)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <ModuleFormDialog
        key={target === "new" || target === "closed" ? target : target.id}
        courseId={courseId}
        target={target}
        onOpenChange={(open) => {
          if (!open) setTarget("closed");
        }}
      />
    </div>
  );
}

function ModuleFormDialog({
  courseId,
  target,
  onOpenChange,
}: {
  courseId: string;
  target: DialogTarget;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("AcademyCourseModules");
  const tStatus = useTranslations("AcademyCatalogStatus");
  const module_ = target === "new" || target === "closed" ? undefined : target;
  const isEdit = Boolean(module_);
  const open = target !== "closed";

  const [title, setTitle] = useState(module_?.title ?? "");
  const [description, setDescription] = useState(module_?.description ?? "");
  const [durationText, setDurationText] = useState(module_?.durationText ?? "");
  const [status, setStatus] = useState<(typeof academyCatalogStatusValues)[number]>(
    module_?.status ?? "draft",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const values = { title, description, durationText, status };
      if (isEdit && module_) {
        await updateAcademyCourseModuleAction(courseId, module_.id, values);
      } else {
        await createAcademyCourseModuleAction(courseId, values);
      }
      toast.success(isEdit ? t("moduleUpdated") : t("moduleAdded"));
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
          <DialogTitle>{isEdit ? t("editModule") : t("addModule")}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="moduleTitle">{t("moduleTitle")}</Label>
            <Input id="moduleTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="moduleDescription">{t("description")}</Label>
            <Textarea
              id="moduleDescription"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="moduleDuration">{t("duration")}</Label>
              <Input
                id="moduleDuration"
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
