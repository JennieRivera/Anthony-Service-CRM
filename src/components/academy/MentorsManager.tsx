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
import { academyRoleStatusValues } from "@/lib/validation/academyMentor";
import { DuplicateMatchList } from "@/components/clients/DuplicateMatchList";
import { findPossibleDuplicateClientsAction } from "@/app/[locale]/(app)/clients/actions";
import {
  createAcademyMentorAction,
  updateAcademyMentorAction,
  updateAcademyMentorStatusAction,
  findAcademyMentorByClientIdAction,
} from "@/app/[locale]/(app)/academy/mentors/actions";
import type { listAcademyMentors } from "@/lib/queries/academyMentors";
import type { ClientDuplicateMatch } from "@/lib/queries/clients";

type Mentor = Awaited<ReturnType<typeof listAcademyMentors>>[number];
// Phase 2B.1 — see the matching type comment in InstructorsManager.tsx.
type DialogTarget = "closed" | "new" | Mentor;

const statusClasses: Record<string, string> = {
  active: "border-transparent bg-primary text-primary-foreground",
  paused: "border-transparent bg-accent/20 text-foreground",
  inactive: "border-border text-muted-foreground bg-transparent",
};

export function MentorsManager({ mentors }: { mentors: Mentor[] }) {
  const t = useTranslations("AcademyMentors");
  const tStatus = useTranslations("AcademyRoleStatus");
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<DialogTarget>("closed");

  function setStatus(id: string, status: (typeof academyRoleStatusValues)[number]) {
    startTransition(async () => {
      await updateAcademyMentorStatusAction(id, status);
      toast.success(t("statusUpdated"));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <Button size="sm" onClick={() => setTarget("new")}>
          <Plus className="h-4 w-4" />
          {t("addMentor")}
        </Button>
      </div>

      {mentors.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnName")}</TableHead>
                <TableHead>{t("columnFocusArea")}</TableHead>
                <TableHead>{t("columnContact")}</TableHead>
                <TableHead>{t("columnStartDate")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentors.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-foreground">
                    {m.clientName ?? m.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.focusArea ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[m.phone, m.email].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.startDate ? formatDate(m.startDate) : "—"}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={m.status}
                      onValueChange={(v) =>
                        setStatus(m.id, v as (typeof academyRoleStatusValues)[number])
                      }
                    >
                      <SelectTrigger className="h-7 w-28" disabled={isPending}>
                        <SelectValue>
                          <Badge className={cn(statusClasses[m.status])}>
                            {tStatus(m.status)}
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
                    <Button size="icon-sm" variant="ghost" onClick={() => setTarget(m)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <MentorFormDialog
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

function MentorFormDialog({
  target,
  onOpenChange,
  onViewExisting,
}: {
  target: DialogTarget;
  onOpenChange: (open: boolean) => void;
  onViewExisting: (existing: Mentor) => void;
}) {
  const t = useTranslations("AcademyMentors");
  const tDup = useTranslations("DuplicateMatch");
  const tStatus = useTranslations("AcademyRoleStatus");
  const mentor = target === "new" || target === "closed" ? undefined : target;
  const isEdit = Boolean(mentor);
  const open = target !== "closed";

  const [clientId, setClientId] = useState(mentor?.clientId ?? "");
  const [linkedName, setLinkedName] = useState(mentor?.clientName ?? "");
  const [name, setName] = useState(mentor?.name ?? "");
  const [email, setEmail] = useState(mentor?.email ?? "");
  const [phone, setPhone] = useState(mentor?.phone ?? "");
  const [focusArea, setFocusArea] = useState(mentor?.focusArea ?? "");
  const [notes, setNotes] = useState(mentor?.notes ?? "");
  const [startDate, setStartDate] = useState(mentor?.startDate ?? "");
  const [status, setStatus] = useState<(typeof academyRoleStatusValues)[number]>(
    mentor?.status ?? "active",
  );
  const [matches, setMatches] = useState<ClientDuplicateMatch[] | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<Mentor | null>(null);
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
      const existing = await findAcademyMentorByClientIdAction(match.id);
      if (existing && existing.id !== mentor?.id) {
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
      const values = { clientId, name, email, phone, focusArea, notes, startDate, status };
      if (isEdit && mentor) {
        await updateAcademyMentorAction(mentor.id, values);
      } else {
        await createAcademyMentorAction(values);
      }
      toast.success(isEdit ? t("mentorUpdated") : t("mentorAdded"));
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
          <DialogTitle>{isEdit ? t("editMentor") : t("addMentor")}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mentorName">{t("name")}</Label>
            <Input id="mentorName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {duplicateWarning ? (
            <div className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-sm text-foreground">{t("alreadyMentorWarning")}</p>
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
              <Label htmlFor="mentorPhone">{t("phone")}</Label>
              <Input id="mentorPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mentorEmail">{t("email")}</Label>
              <Input id="mentorEmail" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mentorFocusArea">{t("focusArea")}</Label>
            <Input
              id="mentorFocusArea"
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mentorNotes">{t("notes")}</Label>
            <Textarea
              id="mentorNotes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mentorStartDate">{t("startDate")}</Label>
              <Input
                id="mentorStartDate"
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
