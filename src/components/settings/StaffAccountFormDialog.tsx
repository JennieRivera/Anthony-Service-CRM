"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Plus, Pencil } from "lucide-react";
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
  staffAccountFormSchema,
  staffRoleValues,
  type StaffAccountFormValues,
} from "@/lib/validation/staffAccount";
import type { User } from "@/lib/db/schema";

export function StaffAccountFormDialog({
  account,
  onSubmit,
}: {
  account?: User;
  onSubmit: (values: StaffAccountFormValues) => Promise<void>;
}) {
  const t = useTranslations("StaffAccounts.form");
  const tLabels = useTranslations("StaffAccounts");
  const tRole = useTranslations("UserRole");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, reset } = useForm<StaffAccountFormValues>({
    resolver: zodResolver(staffAccountFormSchema),
    defaultValues: {
      email: account?.email ?? "",
      name: account?.name ?? "",
      role: (account?.role as (typeof staffRoleValues)[number]) ?? "tax_staff",
    },
  });

  function submit(values: StaffAccountFormValues) {
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(values);
        if (!account) reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size={account ? "sm" : "default"} variant={account ? "outline" : "default"} />
        }
      >
        {account ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {account ? tLabels("edit") : tLabels("add")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{account ? tLabels("edit") : tLabels("add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              disabled={Boolean(account)}
              {...register("email")}
            />
            {account && (
              <p className="text-xs text-muted-foreground">{t("emailNotEditable")}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" {...register("name")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("role")}</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {staffRoleValues.map((role) => (
                      <SelectItem key={role} value={role}>
                        {tRole(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
