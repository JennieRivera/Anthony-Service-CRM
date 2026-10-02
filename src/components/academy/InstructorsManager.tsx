"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Search, Pencil } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { academyRoleStatusValues } from "@/lib/validation/academyInstructor";
import { DuplicateMatchList } from "@/components/clients/DuplicateMatchList";
import { findPossibleDuplicateClientsAction } from "@/app/[locale]/(app)/clients/actions";
import {
  createAcademyInstructorAction,
  updateAcademyInstructorAction,
  updateAcademyInstructorStatusAction,
  findAcademyInstructorByClientIdAction,
} from "@/app/[locale]/(app)/academy/instructors/actions";
import type { listAcademyInstructors } from "@/lib/queries/academyInstructors";
import type { ClientDuplicateMatch } from "@/lib/queries/clients";

type Instructor = Awaited<ReturnType<typeof listAcademyInstructors>>[number];
// Phase 2B.1 — "closed" | "new" | a specific instructor to edit (or to jump
// to via the duplicate-role warning's "View/Edit Existing Instructor").
// Lifted to the parent (one shared dialog instance, not one per row) so
// that warning action can retarget the same dialog at an existing row.
type DialogTarget = "closed" | "new" | Instructor;

const statusClasses: Record<string, string> = {
  active: "border-transparent bg-primary text-primary-foreground",
  paused: "border-transparent bg-accent/20 text-foreground",
  inactive: "border-border text-muted-foreground bg-transparent",
};

export function InstructorsManager({ instructors }: { instructors: Instructor[] }) {
  const t = useTranslations("AcademyInstructors");
  const tStatus = useTranslations("AcademyRoleStatus");
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<DialogTarget>("closed");

  function setStatus(id: string, status: (typeof academyRoleStatusValues)[number]) {
    startTransition(async () => {
      await updateAcademyInstructorStatusAction(id, status);
      toast.success(t("statusUpdated"));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <Button size="sm" onClick={() => setTarget("new")}>
          <Plus className="h-4 w-4" />
          {t("addInstructor")}
        </Button>
      </div>

      {instructors.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnName")}</TableHead>
                <TableHead>{t("columnTitle")}</TableHead>
                <TableHead>{t("columnSpecialty")}</TableHead>
                <TableHead>{t("columnContact")}</TableHead>
                <TableHead>{t("columnStartDate")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {instructors.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium text-foreground">
                    {i.clientName ?? i.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{i.title ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {i.specialty ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[i.phone, i.email].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {i.startDate ? formatDate(i.startDate) : "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={i.status}
                      onValueChange={(v) =>
                        setStatus(i.id, v as (typeof academyRoleStatusValues)[number])
                      }
                    >
                      <SelectTrigger className="h-7 w-28" disabled={isPending}>
                        <SelectValue>
                          <Badge className={cn(statusClasses[i.status])}>
                            {tStatus(i.status)}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {academyRoleStatusValues.map((status) => (
                          <SelectItem key={status} value={status}>
                            {tStatus(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button size="icon-sm" variant="ghost" onClick={() => setTarget(i)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InstructorFormDialog
        key={target === "new" || target === "closed" ? target : target.id}
        target={target}
        onOpenChange={(open) => {
          if (!open) setTarget("closed");
        }}
        onViewExisting={(existing) => setTarget(existing)}
      />
    </div>
  );
}

function InstructorFormDialog({
  target,
  onOpenChange,
  onViewExisting,
}: {
  target: DialogTarget;
  onOpenChange: (open: boolean) => void;
  onViewExisting: (existing: Instructor) => void;
}) {
  const t = useTranslations("AcademyInstructors");
  const tDup = useTranslations("DuplicateMatch");
  const tStatus = useTranslations("AcademyRoleStatus");
  const instructor = target === "new" || target === "closed" ? undefined : target;
  const isEdit = Boolean(instructor);
  const open = target !== "closed";

  const [clientId, setClientId] = useState(instructor?.clientId ?? "");
  const [linkedName, setLinkedName] = useState(instructor?.clientName ?? "");
  const [name, setName] = useState(instructor?.name ?? "");
  const [email, setEmail] = useState(instructor?.email ?? "");
  const [phone, setPhone] = useState(instructor?.phone ?? "");
  const [title, setTitle] = useState(instructor?.title ?? "");
  const [specialty, setSpecialty] = useState(instructor?.specialty ?? "");
  const [bio, setBio] = useState(instructor?.bio ?? "");
  const [startDate, setStartDate] = useState(instructor?.startDate ?? "");
  const [status, setStatus] = useState<(typeof academyRoleStatusValues)[number]>(
    instructor?.status ?? "active",
  );
  const [matches, setMatches] = useState<ClientDuplicateMatch[] | null>(null);
  // Phase 2B.1 — Duplicate Role Safety. Set when linking a client who
  // already has a DIFFERENT academy_instructors row; replaces the normal
  // search/link UI with the warning until staff picks an action.
  const [duplicateWarning, setDuplicateWarning] = useState<Instructor | null>(null);
  const [searchPending, startSearch] = useTransition();
  const [linkPending, startLink] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function searchForMatch() {
    startSearch(async () => {
      const found = await findPossibleDuplicateClientsAction({ fullName: name, email, phone });
      setMatches(found);
    });
  }

  function linkMatch(match: ClientDuplicateMatch) {
    startLink(async () => {
      const existing = await findAcademyInstructorByClientIdAction(match.id);
      if (existing && existing.id !== instructor?.id) {
        setDuplicateWarning(existing);
        setMatches(null);
        return;
      }
      setClientId(match.id);
      setLinkedName(match.fullName);
      setMatches(null);
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const values = { clientId, name, email, phone, title, specialty, bio, startDate, status };
      if (isEdit && instructor) {
        await updateAcademyInstructorAction(instructor.id, values);
      } else {
        await createAcademyInstructorAction(values);
      }
      toast.success(isEdit ? t("instructorUpdated") : t("instructorAdded"));
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
          <DialogTitle>{isEdit ? t("editInstructor") : t("addInstructor")}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instructorName">{t("name")}</Label>
            <Input id="instructorName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {duplicateWarning ? (
            <div className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-sm text-foreground">{t("alreadyInstructorWarning")}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onViewExisting(duplicateWarning)}
                >
                  {t("viewEditExisting")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setDuplicateWarning(null)}
                >
                  {tDup("cancel")}
                </Button>
              </div>
            </div>
          ) : clientId ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-2 text-sm">
              <span className="text-foreground">{linkedName}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setClientId("");
                  setLinkedName("");
                }}
              >
                {t("unlinkClient")}
              </Button>
            </div>
          ) : (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-fit"
                disabled={searchPending}
                onClick={searchForMatch}
              >
                <Search className="h-4 w-4" />
                {searchPending ? tDup("searching") : t("searchExistingPerson")}
              </Button>
              {matches && matches.length === 0 && (
                <p className="text-xs text-muted-foreground">{t("noMatchFoundFreeText")}</p>
              )}
              {matches && matches.length > 0 && (
                <DuplicateMatchList
                  matches={matches}
                  renderActions={(match) => (
                    <Button
                      type="button"
                      size="sm"
                      disabled={linkPending}
                      onClick={() => linkMatch(match)}
                    >
                      {tDup("linkThisPerson")}
                    </Button>
                  )}
                />
              )}
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instructorPhone">{t("phone")}</Label>
              <Input id="instructorPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instructorEmail">{t("email")}</Label>
              <Input id="instructorEmail" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instructorTitle">{t("title")}</Label>
              <Input id="instructorTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instructorSpecialty">{t("specialty")}</Label>
              <Input
                id="instructorSpecialty"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instructorBio">{t("bio")}</Label>
            <Textarea id="instructorBio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instructorStartDate">{t("startDate")}</Label>
              <Input
                id="instructorStartDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("columnStatus")}</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as (typeof academyRoleStatusValues)[number])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {academyRoleStatusValues.map((s) => (
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
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || Boolean(duplicateWarning)}
          >
            {saving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
