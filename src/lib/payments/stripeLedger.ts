import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invoices, payments } from "@/lib/db/schema";
import { businessDateString } from "@/lib/dates";

// Plain server-side functions — deliberately NOT in a "use server" file, so
// they are never exposed as client-callable Server Actions. The Stripe
// webhook (authenticated by its signature, with no user session) calls
// these directly; the staff-facing markInvoicePaidAction wraps markInvoicePaid
// behind requireAuthenticatedUser().

export async function markInvoicePaid(id: string, paymentMethod: string) {
  await getDb()
    .update(invoices)
    .set({
      status: "paid",
      paymentMethod,
      paidAt: new Date(),
    })
    .where(eq(invoices.id, id));

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

// Called from the Stripe webhook after a checkout session completes, so the
// payment ledger stays in sync with the card charge that already marked the
// invoice paid. Never trusts client input — invoiceId/amount come from the
// verified Stripe event, not a form submission.
export async function recordStripePayment({
  invoiceId,
  amountTotal,
  transactionConfirmation,
}: {
  invoiceId: string;
  amountTotal: number;
  transactionConfirmation: string;
}) {
  await getDb().insert(payments).values({
    invoiceId,
    amountTotal: amountTotal.toFixed(2),
    amountPaid: amountTotal.toFixed(2),
    balanceDue: "0.00",
    status: "paid",
    paymentDate: businessDateString(),
    paymentMethod: "Stripe",
    transactionConfirmation,
    refundStatus: "none",
  });

  revalidatePath("/payments");
}
