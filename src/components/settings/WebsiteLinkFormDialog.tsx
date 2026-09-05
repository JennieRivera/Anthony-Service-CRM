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
  websiteLinkFormSchema,
  websiteLinkStatusValues,
  type WebsiteLinkFormValues,
} from "@/lib/validation/websiteLink";
import type { WebsiteLink } from "@/lib/db/schema";

export function WebsiteLinkFormDialog({
  website,
  onSubmit,
}: {
  website?: WebsiteLink;
  onSubmit: (values: WebsiteLinkFormValues) => Promise<void>;
}) {
  const t = useTranslations("MyWebsites.form");
  const tLabels = useTranslations("MyWebsites");
  const tStatus = useTranslations("WebsiteLinkStatus");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, reset } = useForm<WebsiteLinkFormValues>({
    resolver: zodResolver(websiteLinkFormSchema),
    defaultValues: {
      name: website?.name ?? "",
      url: website?.url ?? "",
      status: website?.status ?? "unknown",
      notes: website?.notes ?? "",
      active: website?.active ?? true,
    },
  });

  function submit(values: WebsiteLinkFormValues) {
    startTransition(async () => {
      await onSubmit(values);
      if (!website) reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={website ? "sm" : "default"} variant={website ? "outline" : "default"} />}>
        {website ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {website ? tLabels("edit") : tLabels("add")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{website ? tLabels("edit") : tLabels("add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("name")}</Label>
            <Input id="name" {...register("name")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="url">{t("url")}</Label>
            <Input id="url" placeholder="https://" {...register("url")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("status")}</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {websiteLinkStatusValues.map((v) => (
                      <SelectItem key={v} value={v}>
                        {tStatus(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">{t("notes")}</Label>
            <Textarea id="notes" rows={2} {...register("notes")} />
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
