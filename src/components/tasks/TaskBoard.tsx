"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderOpen,
  User,
  Network,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/dates";
import { useBookingTitle } from "@/components/booking/useBookingTitle";
import { viewHref } from "@/components/documents/downloadHref";
import type { TaskBoardRow } from "@/lib/queries/taskBoard";
import { ExportMenu } from "@/components/export/ExportMenu";
import {
  addTaskNoteAction,
  markTaskDoneAction,
  postponeTaskAction,
  updateTaskDueDateAction,
} from "@/app/[locale]/(app)/tasks/actions";

const APPOINTMENT_TYPES = new Set([
  "appointment_confirmation",
  "appointment_reminder",
  "appointment_change_request",
  "call_client",
]);
const CLIENT_TYPES = new Set(["client_info_review", "service_interest"]);

type DueFilter = "all" | "withDue" | "overdue";

// Overdue and due today first, then appointment confirmations, then the
// rest, inactivity alerts last (there are many and they hide what matters).
function rank(task: TaskBoardRow, today: string): number {
  if (task.type === "inactivity_alert") return 4;
  if (task.dueDate && task.dueDate < today) return 0;
  if (task.dueDate === today) return 1;
  if (task.type === "appointment_confirmation") return 2;
  return 3;
}

// The one direct button each row gets, by task type.
type DirectAction =
  | { kind: "appointment"; href: string }
  | { kind: "document"; href: string }
  | { kind: "client"; href: string }
  | { kind: "case"; href: string }
  | { kind: "alliance"; href: string };

const PARTNER_TYPES = new Set([
  "partner_profile_review",
  "partner_document_review",
  "partner_marketing_review",
  "partner_license_expiring",
]);

function directAction(task: TaskBoardRow): DirectAction {
  const client: DirectAction = task.clientId
    ? { kind: "client", href: `/clients/${task.clientId}` }
    : { kind: "alliance", href: `/alliances/${task.allianceId}` };
  if (task.type === "partner_marketing_review") return { kind: "alliance", href: "/marketing-content" };
  if (PARTNER_TYPES.has(task.type) && task.allianceId) return { kind: "alliance", href: `/alliances/${task.allianceId}` };
  if (APPOINTMENT_TYPES.has(task.type)) {
    return task.appointmentId ? { kind: "appointment", href: `/appointments/${task.appointmentId}` } : client;
  }
  if (task.type === "document_review") {
    return task.documentId ? { kind: "document", href: viewHref(task.documentId) } : client;
  }
  if (CLIENT_TYPES.has(task.type)) return client;
  return task.caseId ? { kind: "case", href: `/cases/${task.caseId}` } : client;
}

// Who a task is about: its client, or (partner portal tasks) its alliance.
const whoKey = (task: TaskBoardRow) => task.clientId ?? `alliance:${task.allianceId}`;
const whoName = (task: TaskBoardRow) => task.clientName ?? task.allianceName ?? "—";
const whoHref = (task: TaskBoardRow) => (task.clientId ? `/clients/${task.clientId}` : `/alliances/${task.allianceId}`);

function DirectButton({ action, size = "sm" }: { action: DirectAction; size?: "sm" | "default" }) {
  const t = useTranslations("Tasks");
  const label = {
    appointment: t("openAppointment"),
    document: t("viewDocument"),
    client: t("openClient"),
    case: t("openCase"),
    alliance: t("openAlliance"),
  }[action.kind];
  const Icon = { appointment: CalendarClock, document: FileText, client: User, case: FolderOpen, alliance: Network }[action.kind];
  if (action.kind === "document") {
    return (
      <Button
        size={size}
        variant="outline"
        render={<a href={action.href} target="_blank" rel="noopener noreferrer" />}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon className="h-4 w-4" />
        {label}
        <ExternalLink className="h-3 w-3" />
      </Button>
    );
  }
  return (
    <Button size={size} variant="outline" render={<Link href={action.href} />} onClick={(e) => e.stopPropagation()}>
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

export function TaskBoard({
  tasks,
  today,
  canExport = false,
}: {
  tasks: TaskBoardRow[];
  today: string;
  canExport?: boolean;
}) {
  const t = useTranslations("Tasks");
  const tType = useTranslations("TaskType");
  const title = useBookingTitle();
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const types = useMemo(() => [...new Set(tasks.map((task) => task.type))], [tasks]);
  const clientOptions = useMemo(() => {
    const byId = new Map(tasks.map((task) => [whoKey(task), whoName(task)]));
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [tasks]);

  const visible = useMemo(
    () =>
      tasks
        .filter((task) => typeFilter === "all" || task.type === typeFilter)
        .filter((task) => clientFilter === "all" || whoKey(task) === clientFilter)
        .filter((task) =>
          dueFilter === "withDue" ? !!task.dueDate : dueFilter === "overdue" ? !!task.dueDate && task.dueDate < today : true,
        )
        .sort(
          (a, b) =>
            rank(a, today) - rank(b, today) ||
            (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [tasks, typeFilter, clientFilter, dueFilter, today],
  );

  const selected = tasks.find((task) => task.id === openId) ?? null;

  function markDone(id: string) {
    startTransition(async () => {
      await markTaskDoneAction(id);
      toast.success(t("markedDone"));
      setOpenId((current) => (current === id ? null : current));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>{t("filterType")}</Label>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAllTypes")}</SelectItem>
              {types.map((type) => (
                <SelectItem key={type} value={type}>
                  {tType(type)} ({tasks.filter((task) => task.type === type).length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("filterClient")}</Label>
          <Select value={clientFilter} onValueChange={(v) => setClientFilter(v ?? "all")}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAllClients")}</SelectItem>
              {clientOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("filterDue")}</Label>
          <Select value={dueFilter} onValueChange={(v) => setDueFilter((v as DueFilter) ?? "all")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterDueAll")}</SelectItem>
              <SelectItem value="withDue">{t("filterDueWith")}</SelectItem>
              <SelectItem value="overdue">{t("filterDueOverdue")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="pb-2 text-sm text-muted-foreground">{t("showing", { shown: visible.length, total: tasks.length })}</p>
        {canExport && (
          <div className="ml-auto">
            <ExportMenu target={{ kind: "list", list: "tasks", ids: visible.map((task) => task.id) }} />
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">{t("noMatches")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnType")}</TableHead>
                <TableHead>{t("columnTitle")}</TableHead>
                <TableHead>{t("columnClient")}</TableHead>
                <TableHead>{t("columnCase")}</TableHead>
                <TableHead>{t("columnDueDate")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((task) => {
                const overdue = !!task.dueDate && task.dueDate < today;
                return (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer"
                    onClick={() => setOpenId(task.id)}
                  >
                    <TableCell>
                      <Badge variant="outline">{tType(task.type)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal">
                      <button
                        type="button"
                        className="cursor-pointer text-left font-medium text-primary underline-offset-2 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenId(task.id);
                        }}
                      >
                        {title(task.title)}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={whoHref(task)}
                        className="text-muted-foreground hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {whoName(task)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {task.caseId ? (
                        <Link
                          href={`/cases/${task.caseId}`}
                          className="text-muted-foreground hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {task.caseTitle}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className={overdue ? "font-medium text-destructive" : "text-muted-foreground"}>
                      {task.dueDate ? formatDate(task.dueDate) : "—"}
                      {overdue && <span className="block text-xs">{t("overdue")}</span>}
                      {task.dueDate === today && <span className="block text-xs text-foreground">{t("dueToday")}</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-2">
                        <DirectButton action={directAction(task)} />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            markDone(task.id);
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {t("markDone")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <TaskDetail
              key={selected.id}
              task={selected}
              today={today}
              pending={isPending}
              onDone={() => markDone(selected.id)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TaskDetail({
  task,
  today,
  pending,
  onDone,
}: {
  task: TaskBoardRow;
  today: string;
  pending: boolean;
  onDone: () => void;
}) {
  const t = useTranslations("Tasks");
  const tType = useTranslations("TaskType");
  const title = useBookingTitle();
  const [due, setDue] = useState(task.dueDate ?? "");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const busy = pending || isPending;
  const direct = directAction(task);

  function saveDue(value: string | null) {
    startTransition(async () => {
      await updateTaskDueDateAction(task.id, value);
      setDue(value ?? "");
      toast.success(value ? t("dueSaved") : t("dueCleared"));
    });
  }

  function postpone(days: 1 | 3 | 7) {
    startTransition(async () => {
      const next = await postponeTaskAction(task.id, days);
      setDue(next);
      toast.success(t("postponedTo", { date: formatDate(next) }));
    });
  }

  function addNote() {
    if (!note.trim()) return;
    startTransition(async () => {
      await addTaskNoteAction(task.id, note);
      setNote("");
      toast.success(t("noteAdded"));
    });
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-6">
      <SheetHeader className="px-0">
        <Badge variant="outline" className="w-fit">
          {tType(task.type)}
        </Badge>
        <SheetTitle className="pr-8 text-base leading-snug wrap-anywhere">{title(task.title)}</SheetTitle>
        <SheetDescription>{t("createdOn", { date: formatDateTime(task.createdAt) })}</SheetDescription>
      </SheetHeader>

      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">{t("columnClient")}</dt>
          <dd>
            <Link href={whoHref(task)} className="text-primary underline">
              {whoName(task)}
            </Link>
            {task.clientId && task.allianceName && (
              <span className="block text-xs text-muted-foreground">{t("fromAlliance", { name: task.allianceName })}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t("columnCase")}</dt>
          <dd>
            {task.caseId ? (
              <Link href={`/cases/${task.caseId}`} className="text-primary underline">
                {task.caseTitle}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        {task.appointmentId && (
          <div>
            <dt className="text-muted-foreground">{t("appointment")}</dt>
            <dd>
              <Link href={`/appointments/${task.appointmentId}`} className="text-primary underline">
                {task.appointmentTitle ? title(task.appointmentTitle) : t("appointment")}
              </Link>
              {task.appointmentStartAt && (
                <span className="block text-muted-foreground">{formatDateTime(task.appointmentStartAt)}</span>
              )}
            </dd>
          </div>
        )}
      </dl>

      <div className="flex flex-col gap-2">
        <Label htmlFor="task-due">{t("columnDueDate")}</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="task-due"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="w-44"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || !due || due === (task.dueDate ?? "")}
            onClick={() => saveDue(due)}
          >
            {t("saveDue")}
          </Button>
          {task.dueDate && (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => saveDue(null)}>
              {t("clearDue")}
            </Button>
          )}
        </div>
        {task.dueDate && task.dueDate < today && <p className="text-xs text-destructive">{t("overdue")}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("postpone")}</span>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => postpone(1)}>
            {t("postponeTomorrow")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => postpone(3)}>
            {t("postpone3Days")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => postpone(7)}>
            {t("postpone1Week")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="task-note">{t("notes")}</Label>
        {task.notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noNotes")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {task.notes.map((n) => (
              <li key={n.id} className="rounded-md border border-border p-2 text-sm">
                <p className="whitespace-pre-line text-foreground wrap-anywhere">{n.body}</p>
                <p className="text-xs text-muted-foreground wrap-anywhere">
                  {formatDateTime(n.createdAt)}
                  {n.createdByEmail ? ` · ${n.createdByEmail}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        <Textarea
          id="task-note"
          rows={3}
          maxLength={2000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("notePlaceholder")}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-fit"
          disabled={busy || !note.trim()}
          onClick={addNote}
        >
          {t("addNote")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button type="button" disabled={busy} onClick={onDone}>
          <CheckCircle2 className="h-4 w-4" />
          {t("markDone")}
        </Button>
        <DirectButton action={direct} size="default" />
      </div>
    </div>
  );
}
