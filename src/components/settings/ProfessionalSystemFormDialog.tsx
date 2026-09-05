"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  professionalSystemFormSchema,
  professionalSystemConnectionStatusValues,
  professionalSystemIntegrationTypeValues,
  type ProfessionalSystemFormValues,
} from "@/lib/validation/professionalSystem";
import type { ProfessionalSystem } from "@/lib/db/schema";

export function ProfessionalSystemFormDialog({
  system,
  onSubmit,
}: {
  system?: ProfessionalSystem;
  onSubmit: (values: ProfessionalSystemFormValues) => Promise<void>;
}) {
  const t = useTranslations("ProfessionalSystems.form");
  const tLabels = useTranslations("ProfessionalSystems");
  const tConnStatus = useTranslations("ProfessionalSystemConnectionStatus");
  const tIntType = useTranslations("ProfessionalSystemIntegrationType");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, reset } =
    useForm<ProfessionalSystemFormValues>({
      resolver: zodResolver(professionalSystemFormSchema),
      defaultValues: {
        name: system?.name ?? "",
        category: system?.category ?? "",
        url: system?.url ?? "",
        icon: system?.icon ?? "",
        description: system?.description ?? "",
        connectionStatus: system?.connectionStatus ?? "not_connected",
        integrationType: system?.integrationType ?? "unknown",
        notes: system?.notes ?? "",
        active: system?.active ?? true,
        openInNewTab: system?.openInNewTab ?? true,
      },
    });

  function submit(values: ProfessionalSystemFormValues) {
    startTransition(async () => {
      await onSubmit(values);
      if (!system) reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={system ? "sm" : "default"} variant={system ? "outline" : "default"} />}>
        {system ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {system ? tLabels("edit") : tLabels("add")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{system ? tLabels("edit") : tLabels("add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" {...register("name")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">{t("category")}</Label>
              <Input id="category" {...register("category")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="url">{t("url")}</Label>
              <Input id="url" placeholder="https://" {...register("url")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="icon">{t("icon")}</Label>
              <Input id="icon" placeholder="🔗" {...register("icon")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("connectionStatus")}</Label>
              <Controller
                control={control}
                name="connectionStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {professionalSystemConnectionStatusValues.map((v) => (
                        <SelectItem key={v} value={v}>
                          {tConnStatus(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("integrationType")}</Label>
              <Controller
                control={control}
                name="integrationType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {professionalSystemIntegrationTypeValues.map((v) => (
                        <SelectItem key={v} value={v}>
                          {tIntType(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">{t("description")}</Label>
            <Textarea id="description" rows={2} {...register("description")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Controller
                control={control}
                name="active"
                render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              {t("active")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Controller
                control={control}
                name="openInNewTab"
                render={({ field }) => (
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              {t("openInNewTab")}
            </label>
          </div>

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
