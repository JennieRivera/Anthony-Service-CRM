"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  companyDocumentChecklistItemFormSchema,
  companyDocumentCategoryValues,
  companyDocumentChecklistStatusValues,
  type CompanyDocumentChecklistItemFormValues,
} from "@/lib/validation/companyDocumentChecklist";
import type { CompanyDocumentChecklistItem } from "@/lib/db/schema";

const statusBadgeVariant: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  requested: "outline",
  received: "secondary",
  verified: "default",
  expired: "destructive",
  renewal_due: "destructive",
};

export function CompanyDocumentChecklist({
  companyId,
  items,
  onCreate,
  onUpdateStatus,
  onDelete,
}: {
  companyId: string;
  items: CompanyDocumentChecklistItem[];
  onCreate: (
    companyId: string,
    values: CompanyDocumentChecklistItemFormValues,
  ) => Promise<void>;
  onUpdateStatus: (
    companyId: string,
    itemId: string,
    values: CompanyDocumentChecklistItemFormValues,
  ) => Promise<void>;
  onDelete: (companyId: string, itemId: string) => Promise<void>;
}) {
  const t = useTranslations("Companies.checklist");
  const tCategory = useTranslations("CompanyDocumentCategory");
  const tStatus = useTranslations("CompanyDocumentChecklistStatus");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, reset } =
    useForm<CompanyDocumentChecklistItemFormValues>({
      resolver: zodResolver(companyDocumentChecklistItemFormSchema),
      defaultValues: {
        category: "formation_documents",
        description: "",
        status: "requested",
        dueDate: "",
        notes: "",
      },
    });

  function submit(values: CompanyDocumentChecklistItemFormValues) {
    startTransition(async () => {
      await onCreate(companyId, values);
      reset();
      setOpen(false);
    });
  }

  function changeStatus(item: CompanyDocumentChecklistItem, status: string | null) {
    if (!status) return;
    startTransition(() =>
      onUpdateStatus(companyId, item.id, {
        category: item.category,
        description: item.description ?? "",
        status: status as CompanyDocumentChecklistItemFormValues["status"],
        dueDate: item.dueDate ?? "",
        notes: item.notes ?? "",
      }),
    );
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
                          {companyDocumentCategoryValues.map((value) => (
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
                          {companyDocumentChecklistStatusValues.map((value) => (
                            <SelectItem key={value} value={value}>
                              {tStatus(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="checklistDescription">{t("description")}</Label>
                  <Input id="checklistDescription" {...register("description")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="checklistDueDate">{t("dueDate")}</Label>
                  <Input id="checklistDueDate" type="date" {...register("dueDate")} />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="checklistNotes">{t("notes")}</Label>
                  <Input id="checklistNotes" {...register("notes")} />
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

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-foreground">
                  {tCategory(item.category)}
                  {item.description ? ` — ${item.description}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.dueDate
                    ? `${t("dueDate")}: ${new Date(item.dueDate).toLocaleDateString()}`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={item.status}
                  onValueChange={(status) => changeStatus(item, status)}
                >
                  <SelectTrigger className="w-auto">
                    <Badge variant={statusBadgeVariant[item.status] ?? "outline"}>
                      {tStatus(item.status)}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    {companyDocumentChecklistStatusValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {tStatus(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isPending}
                  onClick={() => startTransition(() => onDelete(companyId, item.id))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
