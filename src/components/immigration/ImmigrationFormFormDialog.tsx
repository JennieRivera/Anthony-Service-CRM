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
  immigrationFormFormSchema,
  immigrationFormCategoryValues,
  type ImmigrationFormFormValues,
} from "@/lib/validation/immigrationForm";
import type { ImmigrationForm } from "@/lib/db/schema";

export function ImmigrationFormFormDialog({
  form,
  onSubmit,
}: {
  form?: ImmigrationForm;
  onSubmit: (values: ImmigrationFormFormValues) => Promise<void>;
}) {
  const t = useTranslations("ImmigrationForms.form");
  const tLabels = useTranslations("ImmigrationForms");
  const tCategory = useTranslations("ImmigrationFormCategory");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, reset } =
    useForm<ImmigrationFormFormValues>({
      resolver: zodResolver(immigrationFormFormSchema),
      defaultValues: {
        formNumber: form?.formNumber ?? "",
        formName: form?.formName ?? "",
        category: form?.category ?? "family_based",
        officialSource: form?.officialSource ?? "USCIS",
        officialUrl: form?.officialUrl ?? "",
        currentEditionDate: form?.currentEditionDate ?? "",
        editionNotes: form?.editionNotes ?? "",
        filingFeeReference: form?.filingFeeReference ?? "",
        instructionsUrl: form?.instructionsUrl ?? "",
        checklist: form?.checklist ?? "",
        internalNotes: form?.internalNotes ?? "",
        lastVerifiedDate: form?.lastVerifiedDate ?? "",
        verifiedBy: form?.verifiedBy ?? "",
        active: form?.active ?? true,
      },
    });

  function submit(values: ImmigrationFormFormValues) {
    startTransition(async () => {
      await onSubmit(values);
      if (!form) reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size={form ? "sm" : "default"} variant={form ? "outline" : "default"} />
        }
      >
        {form ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {form ? tLabels("edit") : tLabels("add")}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form ? tLabels("edit") : tLabels("add")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="formNumber">{t("formNumber")}</Label>
              <Input id="formNumber" placeholder="I-130" {...register("formNumber")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="formName">{t("formName")}</Label>
              <Input id="formName" {...register("formName")} />
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
                      {immigrationFormCategoryValues.map((value) => (
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
              <Label htmlFor="officialSource">{t("officialSource")}</Label>
              <Input id="officialSource" {...register("officialSource")} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="officialUrl">{t("officialUrl")}</Label>
              <Input
                id="officialUrl"
                placeholder="https://www.uscis.gov/"
                {...register("officialUrl")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentEditionDate">{t("currentEditionDate")}</Label>
              <Input
                id="currentEditionDate"
                type="date"
                {...register("currentEditionDate")}
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filingFeeReference">{t("filingFeeReference")}</Label>
              <Input id="filingFeeReference" {...register("filingFeeReference")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instructionsUrl">{t("instructionsUrl")}</Label>
              <Input
                id="instructionsUrl"
                placeholder="https://"
                {...register("instructionsUrl")}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="editionNotes">{t("editionNotes")}</Label>
              <Input id="editionNotes" {...register("editionNotes")} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="checklist">{t("checklist")}</Label>
              <Textarea id="checklist" rows={2} {...register("checklist")} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="internalNotes">{t("internalNotes")}</Label>
              <Textarea id="internalNotes" rows={2} {...register("internalNotes")} />
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
