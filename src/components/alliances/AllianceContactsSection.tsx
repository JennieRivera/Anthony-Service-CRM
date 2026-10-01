"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
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
import {
  allianceContactFormSchema,
  allianceContactRoleValues,
  type AllianceContactFormValues,
} from "@/lib/validation/allianceContact";
import type { AllianceContact } from "@/lib/db/schema";

// Phase 1.5B — B2B Alliances enhancement. Mirrors CompanySimplePeopleSection's
// shape (optional clientId, free-text fallback) but adds a role preset
// list (Primary Contact/Owner/Billing Contact/Referral Contact/custom)
// since staff specifically asked for those options here.
export function AllianceContactsSection({
  allianceId,
  contacts,
  clients,
  onCreate,
  onDelete,
}: {
  allianceId: string;
  contacts: AllianceContact[];
  clients: { id: string; fullName: string }[];
  onCreate: (allianceId: string, values: AllianceContactFormValues) => Promise<void>;
  onDelete: (allianceId: string, contactId: string) => Promise<void>;
}) {
  const t = useTranslations("Alliances.contacts");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [customRole, setCustomRole] = useState(false);

  const { register, handleSubmit, control, reset } = useForm<AllianceContactFormValues>({
    resolver: zodResolver(allianceContactFormSchema),
    defaultValues: { clientId: "", name: "", role: "", phone: "", email: "", notes: "" },
  });

  function submit(values: AllianceContactFormValues) {
    startTransition(async () => {
      await onCreate(allianceId, values);
      reset();
      setCustomRole(false);
      setOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4" />
            {t("add")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("add")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>{t("linkedClient")}</Label>
                  <Controller
                    control={control}
                    name="clientId"
                    render={({ field }) => (
                      <Select
                        value={field.value || "none"}
                        onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
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
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contactName">{t("name")}</Label>
                  <Input id="contactName" {...register("name")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>{t("role")}</Label>
                  <Controller
                    control={control}
                    name="role"
                    render={({ field }) => (
                      <>
                        <Select
                          value={
                            customRole
                              ? "custom"
                              : (allianceContactRoleValues as readonly string[]).includes(field.value ?? "")
                                ? field.value
                                : "none"
                          }
                          onValueChange={(v) => {
                            if (v === "custom") {
                              setCustomRole(true);
                              field.onChange("");
                            } else if (v === "none") {
                              setCustomRole(false);
                              field.onChange("");
                            } else {
                              setCustomRole(false);
                              field.onChange(v);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {allianceContactRoleValues.map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">{t("customRole")}</SelectItem>
                          </SelectContent>
                        </Select>
                        {customRole && (
                          <Input
                            className="mt-2"
                            placeholder={t("customRolePlaceholder")}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        )}
                      </>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contactPhone">{t("phone")}</Label>
                  <Input id="contactPhone" {...register("phone")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="contactEmail">{t("email")}</Label>
                  <Input id="contactEmail" type="email" {...register("email")} />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactNotes">{t("notes")}</Label>
                <Input id="contactNotes" {...register("notes")} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? t("saving") : t("save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-foreground">
                  {contact.name}
                  {contact.role ? ` — ${contact.role}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {[contact.phone, contact.email].filter(Boolean).join(" · ") || "—"}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                disabled={isPending}
                onClick={() => startTransition(() => onDelete(allianceId, contact.id))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
