"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Building2, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  linkFormationCompanyAction,
  unlinkFormationCompanyAction,
  createCompanyFromFormationAction,
} from "@/app/[locale]/(app)/cases/actions";
import { companyEntityTypeValues } from "@/lib/validation/company";

// Phase 1.5B — Business Formation → Company workflow. Deliberately a
// separate, explicit, staff-triggered control rather than anything wired
// into case-status changes: the user's decision was "manual staff
// confirmation only, never automatic." "Link Existing" always searches
// existing companies first (the select list); "Create New" is the
// fallback when no matching company exists yet, pre-filled from this
// case's own formation fields so staff don't retype them.
export function BusinessFormationCompanyLink({
  caseId,
  currentCompany,
  companies,
  prefill,
}: {
  caseId: string;
  currentCompany: { id: string; legalBusinessName: string } | null;
  companies: { id: string; legalBusinessName: string }[];
  prefill: {
    businessName: string | null;
    formationType: string | null;
    stateOfFormation: string | null;
  };
}) {
  const t = useTranslations("Cases.formationCompany");
  const tEntityType = useTranslations("CompanyEntityType");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [linkCompanyId, setLinkCompanyId] = useState("");
  const [newName, setNewName] = useState(prefill.businessName ?? "");
  const [newEntityType, setNewEntityType] = useState(
    isKnownEntityType(prefill.formationType) ? prefill.formationType : "",
  );
  const [newState, setNewState] = useState(prefill.stateOfFormation ?? "");

  function isKnownEntityType(value: string | null): value is (typeof companyEntityTypeValues)[number] {
    return !!value && (companyEntityTypeValues as readonly string[]).includes(value);
  }

  function handleLink() {
    if (!linkCompanyId) return;
    startTransition(async () => {
      await linkFormationCompanyAction(caseId, linkCompanyId);
      toast.success(t("linked"));
      setOpen(false);
    });
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createCompanyFromFormationAction(caseId, {
        legalBusinessName: newName,
        entityType: (newEntityType || "") as never,
        stateOfFormation: newState,
      });
      toast.success(t("created"));
      setOpen(false);
    });
  }

  function handleUnlink() {
    startTransition(async () => {
      await unlinkFormationCompanyAction(caseId);
      toast.success(t("unlinked"));
    });
  }

  if (currentCompany) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">{t("currentCompany")}:</span>
        <a href={`/companies/${currentCompany.id}`} className="font-medium text-foreground hover:underline">
          {currentCompany.legalBusinessName}
        </a>
        <Button variant="outline" size="sm" disabled={isPending} onClick={handleUnlink}>
          <Unlink className="h-3.5 w-3.5" />
          {t("unlinkButton")}
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Link2 className="h-3.5 w-3.5" />
        {t("createOrLinkButton")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="link">
          <TabsList>
            <TabsTrigger value="link">{t("tabLinkExisting")}</TabsTrigger>
            <TabsTrigger value="create">{t("tabCreateNew")}</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t("selectCompany")}</Label>
              <Select value={linkCompanyId} onValueChange={(v) => setLinkCompanyId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectCompanyPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.legalBusinessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button disabled={!linkCompanyId || isPending} onClick={handleLink}>
                {t("linkButton")}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="create" className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newCompanyName">{t("legalBusinessName")}</Label>
              <Input
                id="newCompanyName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("entityType")}</Label>
              <Select value={newEntityType || "none"} onValueChange={(v) => setNewEntityType(!v || v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {companyEntityTypeValues.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tEntityType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newCompanyState">{t("stateOfFormation")}</Label>
              <Input
                id="newCompanyState"
                value={newState}
                onChange={(e) => setNewState(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button disabled={!newName.trim() || isPending} onClick={handleCreate}>
                {t("createButton")}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
