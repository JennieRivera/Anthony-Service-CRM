"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
  paymentFormSchema,
  paymentStatusValues,
  refundStatusValues,
  type PaymentFormValues,
} from "@/lib/validation/payment";
import type { Payment } from "@/lib/db/schema";

type InvoiceOption = {
  id: string;
  invoiceSeq: number;
  total: string;
  issueDate: string;
  clientName: string;
};

export function PaymentForm({
  payment,
  invoices,
  defaultInvoiceId,
  onSubmit,
}: {
  payment?: Payment;
  invoices: InvoiceOption[];
  defaultInvoiceId?: string;
  onSubmit: (values: PaymentFormValues) => Promise<void>;
}) {
  const t = useTranslations("Payments.form");
  const tPayments = useTranslations("Payments");
  const tStatus = useTranslations("PaymentStatus");
  const tRefund = useTranslations("RefundStatus");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      invoiceId: payment?.invoiceId ?? defaultInvoiceId ?? "",
      depositAmount: payment?.depositAmount ?? "",
      amountPaid: payment?.amountPaid ?? "0",
      status: payment?.status ?? "unpaid",
      paymentDate: payment?.paymentDate ?? "",
      paymentMethod: payment?.paymentMethod ?? "",
      transactionConfirmation: payment?.transactionConfirmation ?? "",
      receiptNumber: payment?.receiptNumber ?? "",
      refundStatus: payment?.refundStatus ?? "none",
    },
  });

  const selectedInvoiceId = watch("invoiceId");
  const amountPaid = Number(watch("amountPaid")) || 0;
  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);
  const invoiceTotal = selectedInvoice ? Number(selectedInvoice.total) : 0;
  const balanceDue = Math.max(invoiceTotal - amountPaid, 0);

  async function submit(values: PaymentFormValues) {
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
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>{t("invoice")}</Label>
          <Controller
            control={control}
            name="invoiceId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectInvoice")} />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((invoice) => (
                    <SelectItem key={invoice.id} value={invoice.id}>
                      INV-{String(invoice.invoiceSeq).padStart(5, "0")} —{" "}
                      {invoice.clientName} (${Number(invoice.total).toFixed(2)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.invoiceId && (
            <p className="text-sm text-destructive">
              {errors.invoiceId.message}
            </p>
          )}
        </div>

        {selectedInvoice && (
          <div className="flex gap-8 text-sm sm:col-span-2">
            <div className="flex flex-col">
              <span className="text-muted-foreground">
                {tPayments("invoiceDate")}
              </span>
              <span className="text-foreground">
                {new Date(selectedInvoice.issueDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">
                {tPayments("amountTotal")}
              </span>
              <span className="text-foreground">
                ${invoiceTotal.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="depositAmount">{t("depositAmount")}</Label>
          <Input
            id="depositAmount"
            type="number"
            step="0.01"
            {...register("depositAmount")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amountPaid">{t("amountPaid")}</Label>
          <Input
            id="amountPaid"
            type="number"
            step="0.01"
            {...register("amountPaid")}
          />
          {errors.amountPaid && (
            <p className="text-sm text-destructive">
              {errors.amountPaid.message}
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
                  {paymentStatusValues.map((status) => (
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
          <Label htmlFor="paymentDate">{t("paymentDate")}</Label>
          <Input id="paymentDate" type="date" {...register("paymentDate")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paymentMethod">{t("paymentMethod")}</Label>
          <Input id="paymentMethod" {...register("paymentMethod")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="transactionConfirmation">
            {t("transactionConfirmation")}
          </Label>
          <Input
            id="transactionConfirmation"
            {...register("transactionConfirmation")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="receiptNumber">{t("receiptNumber")}</Label>
          <Input id="receiptNumber" {...register("receiptNumber")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("refundStatus")}</Label>
          <Controller
            control={control}
            name="refundStatus"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {refundStatusValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {tRefund(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      {selectedInvoice && (
        <div className="flex justify-end text-lg font-medium text-foreground">
          {tPayments("balanceDue")}: ${balanceDue.toFixed(2)}
        </div>
      )}

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
