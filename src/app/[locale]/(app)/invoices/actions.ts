"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invoices, invoiceLineItems } from "@/lib/db/schema";
import {
  invoiceFormSchema,
  markPaidSchema,
  type InvoiceFormValues,
} from "@/lib/validation/invoice";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { markInvoicePaid } from "@/lib/payments/stripeLedger";
import { requireAuthenticatedUser } from "@/lib/permissions";

function computeTotal(items: InvoiceFormValues["items"]) {
  return items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0,
  );
}

export async function createInvoiceAction(rawValues: InvoiceFormValues) {
  await requireAuthenticatedUser();
  const values = invoiceFormSchema.parse(rawValues);
  const db = getDb();
  const total = computeTotal(values.items);

  const [invoice] = await db
    .insert(invoices)
    .values({
      clientId: values.clientId,
      caseId: values.caseId || null,
      status: values.status,
      issueDate: values.issueDate,
      dueDate: values.dueDate || null,
      subtotal: total.toFixed(2),
      total: total.toFixed(2),
      notes: values.notes || null,
    })
    .returning({ id: invoices.id });

  await db.insert(invoiceLineItems).values(
    values.items.map((item, index) => ({
      invoiceId: invoice.id,
      description: item.description,
      quantity: Number(item.quantity).toFixed(2),
      unitPrice: Number(item.unitPrice).toFixed(2),
      lineTotal: (Number(item.quantity) * Number(item.unitPrice)).toFixed(2),
      sortOrder: index,
    })),
  );

  revalidatePath("/invoices");
  revalidatePath(`/clients/${values.clientId}`);
  const locale = await getLocale();
  redirect({ href: `/invoices/${invoice.id}`, locale });
}

export async function markInvoicePaidAction(
  id: string,
  rawValues: { paymentMethod: string },
) {
  await requireAuthenticatedUser();
  const values = markPaidSchema.parse(rawValues);
  await markInvoicePaid(id, values.paymentMethod);
}

export async function cancelInvoiceAction(id: string) {
  await requireAuthenticatedUser();
  const db = getDb();
  await db
    .update(invoices)
    .set({ status: "cancelled" })
    .where(eq(invoices.id, id));

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}
