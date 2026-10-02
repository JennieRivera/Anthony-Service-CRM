"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Gem, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { businessDateString, formatDate } from "@/lib/dates";
import { DuplicateMatchList } from "@/components/clients/DuplicateMatchList";
import { findPossibleDuplicateClientsAction } from "@/app/[locale]/(app)/clients/actions";
import type { ClientDuplicateMatch } from "@/lib/queries/clients";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  diamondMemberTypeValues,
  diamondMemberStatusValues,
} from "@/lib/validation/academyDiamond";
import {
  createDiamondMemberAction,
  updateDiamondMemberStatusAction,
} from "@/app/[locale]/(app)/diamond-community/actions";
import type { listDiamondMembers, listAcademyStudentsForSelect } from "@/lib/queries/academyDiamond";

type Member = Awaited<ReturnType<typeof listDiamondMembers>>[number];
type StudentOption = Awaited<ReturnType<typeof listAcademyStudentsForSelect>>[number];

const statusClasses: Record<string, string> = {
  active: "border-transparent bg-primary text-primary-foreground",
  paused: "border-transparent bg-accent/20 text-foreground",
  removed: "border-border text-muted-foreground bg-transparent",
};

export function DiamondCommunityManager({
  members,
  students,
  clients,
}: {
  members: Member[];
  students: StudentOption[];
  clients: { id: string; fullName: string }[];
}) {
  const t = useTranslations("DiamondCommunity");
  const tStatus = useTranslations("DiamondMemberStatus");
  const tType = useTranslations("DiamondMemberType");
  const [isPending, startTransition] = useTransition();

  function setStatus(id: string, status: (typeof diamondMemberStatusValues)[number]) {
    startTransition(async () => {
      await updateDiamondMemberStatusAction(id, status);
      toast.success(t("statusUpdated"));
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Gem className="h-4 w-4" />
          {t("subtitle")}
        </div>
        <AddMemberDialog students={students} clients={clients} />
      </div>

      {members.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnName")}</TableHead>
                <TableHead>{t("columnType")}</TableHead>
                <TableHead>{t("columnProgram")}</TableHead>
                <TableHead>{t("columnContact")}</TableHead>
                <TableHead>{t("columnJoined")}</TableHead>
                <TableHead>{t("columnStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-foreground">
                    {m.memberType === "student"
                      ? m.studentName
                      : m.teacherClientName ?? m.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {tType(m.memberType)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.program ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[m.phone, m.email].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(m.joinedDate)}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={m.status}
                      onValueChange={(v) =>
                        setStatus(m.id, v as (typeof diamondMemberStatusValues)[number])
                      }
                    >
                      <SelectTrigger className="h-7 w-32" disabled={isPending}>
                        <SelectValue>
                          <Badge className={cn(statusClasses[m.status])}>
                            {tStatus(m.status)}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {diamondMemberStatusValues.map((status) => (
                          <SelectItem key={status} value={status}>
                            {tStatus(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function AddMemberDialog({
  students,
  clients,
}: {
  students: StudentOption[];
  clients: { id: string; fullName: string }[];
}) {
  const t = useTranslations("DiamondCommunity");
  const tType = useTranslations("DiamondMemberType");
  const tDup = useTranslations("DuplicateMatch");
  const [open, setOpen] = useState(false);
  const [memberType, setMemberType] = useState<(typeof diamondMemberTypeValues)[number]>(
    "student",
  );
  const [caseId, setCaseId] = useState("");
  const [teacherClientId, setTeacherClientId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [joinedDate, setJoinedDate] = useState(
    () => businessDateString(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Phase 2A — Master Person Identity Safety Net. For non-student member
  // types (teacher/instructor/mentor/mentee), search the existing clients
  // master registry before falling back to the free-text name/phone/email
  // below — reuses the same findPossibleDuplicateClients matching logic as
  // the New Client dialog and Academy New Student search. Never restructures
  // academy_diamond_members: a match just sets teacherClientId, exactly like
  // picking one from the existing "linked client" dropdown.
  const [matches, setMatches] = useState<ClientDuplicateMatch[] | null>(null);
  const [searchPending, startSearch] = useTransition();

  function searchForMatch() {
    startSearch(async () => {
      const found = await findPossibleDuplicateClientsAction({
        fullName: name,
        email,
        phone,
      });
      setMatches(found);
    });
  }

  function linkMatch(match: ClientDuplicateMatch) {
    setTeacherClientId(match.id);
    setMatches(null);
  }

  function reset() {
    setMemberType("student");
    setCaseId("");
    setTeacherClientId("");
    setName("");
    setPhone("");
    setEmail("");
    setJoinedDate(businessDateString());
    setError(null);
    setMatches(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const selectedStudent = students.find((s) => s.caseId === caseId);
    try {
      await createDiamondMemberAction({
        memberType,
        clientId: selectedStudent?.clientId ?? "",
        caseId: selectedStudent?.caseId ?? "",
        teacherClientId,
        name,
        phone,
        email,
        joinedDate,
        notes: "",
      });
      toast.success(t("memberAdded"));
      reset();
      setOpen(false);
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4" />
        {t("addMember")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("addMember")}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("memberType")}</Label>
            <Select
              value={memberType}
              onValueChange={(v) => {
                setMemberType(v as (typeof diamondMemberTypeValues)[number]);
                setTeacherClientId("");
                setMatches(null);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {diamondMemberTypeValues.map((type) => (
                  <SelectItem key={type} value={type}>
                    {tType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {memberType === "student" ? (
            <div className="flex flex-col gap-1.5">
              <Label>{t("student")}</Label>
              <Select value={caseId} onValueChange={(v) => setCaseId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectStudent")} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.caseId} value={s.caseId}>
                      {s.studentName} — {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="teacherName">{t("teacherName")}</Label>
                <Input id="teacherName" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              {teacherClientId ? (
                <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 p-2 text-sm">
                  <span className="text-foreground">
                    {clients.find((c) => c.id === teacherClientId)?.fullName}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setTeacherClientId("")}
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
                    <p className="text-xs text-muted-foreground">
                      {t("noMatchFoundFreeText")}
                    </p>
                  )}
                  {matches && matches.length > 0 && (
                    <DuplicateMatchList
                      matches={matches}
                      renderActions={(match) => (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => linkMatch(match)}
                        >
                          {tDup("linkThisPerson")}
                        </Button>
                      )}
                    />
                  )}

                  <div className="flex flex-col gap-1.5">
                    <Label>{t("orSelectManually")}</Label>
                    <Select
                      value={teacherClientId || "none"}
                      onValueChange={(v) => setTeacherClientId(!v || v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("noLinkedClient")}</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="joinedDate">{t("joinedDate")}</Label>
            <Input
              id="joinedDate"
              type="date"
              value={joinedDate}
              onChange={(e) => setJoinedDate(e.target.value)}
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
