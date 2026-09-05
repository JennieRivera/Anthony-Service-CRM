"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
  companyOwnerFormSchema,
  type CompanyOwnerFormValues,
} from "@/lib/validation/company";
import {
  createCompanyOwnerAction,
  deleteCompanyOwnerAction,
} from "@/app/[locale]/(app)/companies/actions";
import type { CompanyOwner } from "@/lib/db/schema";

export function CompanyOwnersSection({
  companyId,
  owners,
  clients,
}: {
  companyId: string;
  owners: CompanyOwner[];
  clients: { id: string; fullName: string }[];
}) {
  const t = useTranslations("Companies.owners");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, reset } = useForm<CompanyOwnerFormValues>({
    resolver: zodResolver(companyOwnerFormSchema),
    defaultValues: {
      clientId: "",
      name: "",
      role: "",
      ownershipPercentage: "",
      phone: "",
      email: "",
      preferredLanguage: "",
      authorizedSigner: false,
      startDate: "",
      endDate: "",
      notes: "",
    },
  });

  function submit(values: CompanyOwnerFormValues) {
    startTransition(async () => {
      await createCompanyOwnerAction(companyId, values);
      reset();
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
                  <Label htmlFor="ownerName">{t("name")}</Label>
                  <Input id="ownerName" {...register("name")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ownerRole">{t("role")}</Label>
                  <Input id="ownerRole" {...register("role")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ownershipPercentage">{t("ownershipPercentage")}</Label>
                  <Input id="ownershipPercentage" type="number" step="0.01" {...register("ownershipPercentage")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ownerPhone">{t("phone")}</Label>
                  <Input id="ownerPhone" {...register("phone")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ownerEmail">{t("email")}</Label>
                  <Input id="ownerEmail" type="email" {...register("email")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ownerStartDate">{t("startDate")}</Label>
                  <Input id="ownerStartDate" type="date" {...register("startDate")} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Controller
                    control={control}
                    name="authorizedSigner"
                    render={({ field }) => (
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                  <Label>{t("authorizedSigner")}</Label>
                </div>
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

      {owners.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {owners.map((owner) => (
            <div
              key={owner.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{owner.name}</span>
                  {owner.role && <Badge variant="outline">{owner.role}</Badge>}
                  {owner.authorizedSigner && (
                    <Badge variant="outline">{t("authorizedSigner")}</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {owner.ownershipPercentage
                    ? `${Number(owner.ownershipPercentage).toFixed(2)}%`
                    : "—"}
                  {owner.email ? ` · ${owner.email}` : ""}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                disabled={isPending}
                onClick={() =>
                  startTransition(() => deleteCompanyOwnerAction(companyId, owner.id))
                }
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
