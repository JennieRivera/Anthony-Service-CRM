"use client";

import { useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  invoiceFormSchema,
  invoiceStatusValues,
  type InvoiceFormValues,
} from "@/lib/validation/invoice";

export function InvoiceForm({
  clients,
  defaultClientId,
  onSubmit,
}: {
  clients: { id: string; fullName: string }[];
  defaultClientId?: string;
  onSubmit: (values: InvoiceFormValues) => Promise<void>;
}) {
  const t = useTranslations("Invoices.form");
  const tInvoices = useTranslations("Invoices");
  const tStatus = useTranslations("InvoiceStatus");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: defaultClientId ?? "",
      caseId: "",
      status: "unpaid",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: "",
      notes: "",
      items: [{ description: "", quantity: "1", unitPrice: "0" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const items = watch("items");
  const total = items.reduce(
    (sum, item) =>
      sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );

  async function submit(values: InvoiceFormValues) {
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("client")}</Label>
          <Controller
            control={control}
            name="clientId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectClient")} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.clientId && (
            <p className="text-sm text-destructive">
              {errors.clientId.message}
            </p>
          )}
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
                  {invoiceStatusValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {tStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="issueDate">{t("issueDate")}</Label>
          <Input id="issueDate" type="date" {...register("issueDate")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dueDate">{t("dueDate")}</Label>
          <Input id="dueDate" type="date" {...register("dueDate")} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>{tInvoices("lineItems")}</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              append({ description: "", quantity: "1", unitPrice: "0" })
            }
          >
            <Plus className="h-4 w-4" />
            {t("addLine")}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_80px_120px_120px_auto] sm:items-end"
            >
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t("description")}</Label>
                <Input {...register(`items.${index}.description` as const)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t("quantity")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register(`items.${index}.quantity` as const)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t("unitPrice")}</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register(`items.${index}.unitPrice` as const)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t("lineTotal")}</Label>
                <p className="flex h-9 items-center text-sm text-foreground">
                  $
                  {(
                    (Number(items[index]?.quantity) || 0) *
                    (Number(items[index]?.unitPrice) || 0)
                  ).toFixed(2)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                aria-label={t("removeLine")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        {errors.items && (
          <p className="text-sm text-destructive">
            {errors.items.message ?? errors.items.root?.message}
          </p>
        )}

        <div className="flex justify-end text-lg font-medium text-foreground">
          {tInvoices("total")}: ${total.toFixed(2)}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
