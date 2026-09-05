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
  irsResourceFormSchema,
  irsResourceCategoryValues,
  type IrsResourceFormValues,
} from "@/lib/validation/irsResource";
import type { IrsResource } from "@/lib/db/schema";

export function IrsResourceFormDialog({
  resource,
  onSubmit,
}: {
  resource?: IrsResource;
  onSubmit: (values: IrsResourceFormValues) => Promise<void>;
}) {
  const t = useTranslations("IrsResources.form");
  const tLabels = useTranslations("IrsResources");
  const tCategory = useTranslations("IrsResourceCategory");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, reset } =
    useForm<IrsResourceFormValues>({
      resolver: zodResolver(irsResourceFormSchema),
      defaultValues: {
        name: resource?.name ?? "",
        category: resource?.category ?? "ein",
        url: resource?.url ?? "",
        description: resource?.description ?? "",
        lastVerifiedDate: resource?.lastVerifiedDate ?? "",
        verifiedBy: resource?.verifiedBy ?? "",
        active: resource?.active ?? true,
      },
    });

  function submit(values: IrsResourceFormValues) {
    startTransition(async () => {
      await onSubmit(values);
      if (!resource) reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size={resource ? "sm" : "default"} variant={resource ? "outline" : "default"} />
        }
      >
        {resource ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {resource ? tLabels("edit") : tLabels("add")}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resource ? tLabels("edit") : tLabels("add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="name">{t("name")}</Label>
              <Input id="name" {...register("name")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("category")}</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {irsResourceCategoryValues.map((value) => (
                        <SelectItem key={value} value={value}>
                          {tCategory(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastVerifiedDate">{t("lastVerifiedDate")}</Label>
              <Input
                id="lastVerifiedDate"
                type="date"
                {...register("lastVerifiedDate")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="verifiedBy">{t("verifiedBy")}</Label>
              <Input id="verifiedBy" {...register("verifiedBy")} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="url">{t("url")}</Label>
              <Input id="url" placeholder="https://www.irs.gov/" {...register("url")} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Textarea id="description" rows={2} {...register("description")} />
            </div>
          </div>

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
