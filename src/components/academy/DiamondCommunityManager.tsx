"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}: {
  members: Member[];
  students: StudentOption[];
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
        <AddMemberDialog students={students} />
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
                    {m.memberType === "student" ? m.studentName : m.name}
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
                    {new Date(m.joinedDate).toLocaleDateString()}
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

function AddMemberDialog({ students }: { students: StudentOption[] }) {
  const t = useTranslations("DiamondCommunity");
  const tType = useTranslations("DiamondMemberType");
  const [open, setOpen] = useState(false);
  const [memberType, setMemberType] = useState<(typeof diamondMemberTypeValues)[number]>(
    "student",
  );
  const [caseId, setCaseId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [joinedDate, setJoinedDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function reset() {
    setMemberType("student");
    setCaseId("");
    setName("");
    setPhone("");
    setEmail("");
    setJoinedDate(new Date().toISOString().slice(0, 10));
    setError(null);
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
              onValueChange={(v) =>
                setMemberType(v as (typeof diamondMemberTypeValues)[number])
              }
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="teacherName">{t("teacherName")}</Label>
              <Input id="teacherName" value={name} onChange={(e) => setName(e.target.value)} />
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
