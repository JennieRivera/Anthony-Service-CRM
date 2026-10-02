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
import { academyAttendanceStatusValues } from "@/lib/validation/academyAttendanceRecord";
import {
  createAttendanceSessionAction,
  updateAttendanceSessionAction,
  markAttendanceAction,
  getAttendanceRosterAction,
} from "@/app/[locale]/(app)/academy/courses/actions";
import type { listAttendanceSessionsForCourse, listAttendanceForSession } from "@/lib/queries/academyAttendance";

type Session = Awaited<ReturnType<typeof listAttendanceSessionsForCourse>>[number];
type RosterEntry = Awaited<ReturnType<typeof listAttendanceForSession>>[number];
type SessionDialogTarget = "closed" | "new" | Session;

const attendanceStatusClasses: Record<string, string> = {
  present: "border-transparent bg-success text-success-foreground",
  late: "border-transparent bg-info text-info-foreground",
  absent: "border-transparent bg-destructive/10 text-destructive",
  excused: "border-border text-muted-foreground bg-transparent",
};

export function CourseAttendanceManager({
  courseId,
  sessions,
}: {
  courseId: string;
  sessions: Session[];
}) {
  const t = useTranslations("AcademyAttendance");
  const [sessionTarget, setSessionTarget] = useState<SessionDialogTarget>("closed");
  const [rosterSessionId, setRosterSessionId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        <Button size="sm" onClick={() => setSessionTarget("new")}>
          <Plus className="h-4 w-4" />
          {t("addSession")}
        </Button>
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("noSessions")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col">
                <span className="font-medium text-foreground">
                  {formatDate(s.sessionDate)}
                  {s.title ? ` — ${s.title}` : ""}
                </span>
                {s.notes && <span className="text-xs text-muted-foreground">{s.notes}</span>}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRosterSessionId(s.id)}
                >
                  <Users className="h-3.5 w-3.5" />
                  {t("markAttendance")}
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => setSessionTarget(s)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SessionFormDialog
        key={`session-${sessionTarget === "new" || sessionTarget === "closed" ? sessionTarget : sessionTarget.id}`}
        courseId={courseId}
        target={sessionTarget}
        onOpenChange={(open) => {
          if (!open) setSessionTarget("closed");
        }}
      />

      <RosterDialog
        key={`roster-${rosterSessionId ?? "closed"}`}
        courseId={courseId}
        sessionId={rosterSessionId}
        onOpenChange={(open) => {
          if (!open) setRosterSessionId(null);
        }}
      />
    </div>
  );
}

function SessionFormDialog({
  courseId,
  target,
  onOpenChange,
}: {
  courseId: string;
  target: SessionDialogTarget;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("AcademyAttendance");
  const session = target === "new" || target === "closed" ? undefined : target;
  const isEdit = Boolean(session);
  const open = target !== "closed";

  const [sessionDate, setSessionDate] = useState(session?.sessionDate ?? "");
  const [title, setTitle] = useState(session?.title ?? "");
  const [notes, setNotes] = useState(session?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const values = { sessionDate, title, notes };
      if (isEdit && session) {
        await updateAttendanceSessionAction(courseId, session.id, values);
      } else {
        await createAttendanceSessionAction(courseId, values);
      }
      toast.success(isEdit ? t("sessionUpdated") : t("sessionAdded"));
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
          <DialogTitle>{isEdit ? t("editSession") : t("addSession")}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sessionDate">{t("sessionDate")}</Label>
            <Input
              id="sessionDate"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sessionTitle">{t("sessionTitle")}</Label>
            <Input id="sessionTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sessionNotes">{t("notes")}</Label>
            <Textarea
              id="sessionNotes"
              rows={3}
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

function RosterDialog({
  courseId,
  sessionId,
  onOpenChange,
}: {
  courseId: string;
  sessionId: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("AcademyAttendance");
  const tStatus = useTranslations("AcademyAttendanceStatus");
  const open = sessionId !== null;
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function loadRoster() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await getAttendanceRosterAction(courseId, sessionId);
      setRoster(data);
    } finally {
      setLoading(false);
    }
  }

  // The parent remounts this component (via a key keyed on sessionId) every
  // time the dialog opens for a different session, so a mount-time effect is
  // enough — no need to watch sessionId changes. Base UI's Dialog onOpenChange
  // only fires on dialog-internal interactions (Close button, Escape,
  // overlay click), never when `open` is flipped true by this externally
  // controlled prop, so loading the roster can't be wired to onOpenChange.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mark(enrollmentCaseId: string, status: (typeof academyAttendanceStatusValues)[number]) {
    if (!sessionId) return;
    startTransition(async () => {
      await markAttendanceAction(courseId, sessionId, enrollmentCaseId, {
        attendanceStatus: status,
        notes: "",
      });
      setRoster((prev) =>
        prev
          ? prev.map((r) =>
              r.enrollmentCaseId === enrollmentCaseId ? { ...r, attendanceStatus: status } : r,
            )
          : prev,
      );
      toast.success(t("attendanceMarked"));
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("markAttendance")}</DialogTitle>
        </DialogHeader>
        {loading && <p className="text-sm text-muted-foreground">{t("loading")}</p>}
        {!loading && roster && roster.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noEnrolledStudents")}</p>
        )}
        {!loading && roster && roster.length > 0 && (
          <div className="flex flex-col gap-2">
            {roster.map((r) => (
              <div
                key={r.enrollmentCaseId}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-2"
              >
                <span className="text-sm text-foreground">{r.clientName}</span>
                <Select
                  value={r.attendanceStatus ?? undefined}
                  onValueChange={(v) =>
                    mark(
                      r.enrollmentCaseId,
                      v as (typeof academyAttendanceStatusValues)[number],
                    )
                  }
                >
                  <SelectTrigger className="h-7 w-32" disabled={isPending}>
                    <SelectValue placeholder={t("notMarked")}>
                      {r.attendanceStatus && (
                        <Badge className={cn(attendanceStatusClasses[r.attendanceStatus])}>
                          {tStatus(r.attendanceStatus)}
                        </Badge>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {academyAttendanceStatusValues.map((status) => (
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
      </DialogContent>
    </Dialog>
  );
}
