"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import {
  paymentFormSchema,
  type PaymentFormValues,
} from "@/lib/validation/payment";
import { getInvoiceForPayment } from "@/lib/queries/payments";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

function computeBalance(amountTotal: number, amountPaid: number) {
  return Math.max(amountTotal - amountPaid, 0).toFixed(2);
}

export async function createPaymentAction(rawValues: PaymentFormValues) {
  const values = paymentFormSchema.parse(rawValues);
  const invoice = await getInvoiceForPayment(values.invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  const db = getDb();
  const amountPaid = Number(values.amountPaid) || 0;
  const amountTotal = Number(invoice.total);

  const [created] = await db
    .insert(payments)
    .values({
      invoiceId: values.invoiceId,
      amountTotal: amountTotal.toFixed(2),
      depositAmount: values.depositAmount
        ? Number(values.depositAmount).toFixed(2)
        : null,
      amountPaid: amountPaid.toFixed(2),
      balanceDue: computeBalance(amountTotal, amountPaid),
      status: values.status,
      paymentDate: values.paymentDate || null,
      paymentMethod: values.paymentMethod || null,
      transactionConfirmation: values.transactionConfirmation || null,
      receiptNumber: values.receiptNumber || null,
      refundStatus: values.refundStatus,
    })
    .returning({ id: payments.id });

  revalidatePath("/payments");
  revalidatePath(`/invoices/${values.invoiceId}`);
  const locale = await getLocale();
  redirect({ href: `/payments/${created.id}`, locale });
}

export async function updatePaymentAction(
  id: string,
  rawValues: PaymentFormValues,
) {
  const values = paymentFormSchema.parse(rawValues);
  const invoice = await getInvoiceForPayment(values.invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  const db = getDb();
  const amountPaid = Number(values.amountPaid) || 0;
  const amountTotal = Number(invoice.total);

  await db
    .update(payments)
    .set({
      invoiceId: values.invoiceId,
      amountTotal: amountTotal.toFixed(2),
      depositAmount: values.depositAmount
        ? Number(values.depositAmount).toFixed(2)
        : null,
      amountPaid: amountPaid.toFixed(2),
      balanceDue: computeBalance(amountTotal, amountPaid),
      status: values.status,
      paymentDate: values.paymentDate || null,
      paymentMethod: values.paymentMethod || null,
      transactionConfirmation: values.transactionConfirmation || null,
      receiptNumber: values.receiptNumber || null,
      refundStatus: values.refundStatus,
    })
    .where(eq(payments.id, id));

  revalidatePath("/payments");
  revalidatePath(`/payments/${id}`);
  revalidatePath(`/invoices/${values.invoiceId}`);
  const locale = await getLocale();
  redirect({ href: `/payments/${id}`, locale });
}

// Called from the Stripe webhook after a checkout session completes, so the
// payment ledger stays in sync with the card charge that already marked the
// invoice paid. Never trusts client input — invoiceId/amount come from the
// verified Stripe event, not a form submission.
export async function recordStripePaymentAction({
  invoiceId,
  amountTotal,
  transactionConfirmation,
}: {
  invoiceId: string;
  amountTotal: number;
  transactionConfirmation: string;
}) {
  const db = getDb();

  await db.insert(payments).values({
    invoiceId,
    amountTotal: amountTotal.toFixed(2),
    amountPaid: amountTotal.toFixed(2),
    balanceDue: "0.00",
    status: "paid",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "Stripe",
    transactionConfirmation,
    refundStatus: "none",
  });

  revalidatePath("/payments");
}
