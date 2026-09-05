import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeClient, isStripeConfigured } from "@/lib/payments/stripe";
import { markInvoicePaidAction } from "@/app/[locale]/(app)/invoices/actions";
import { recordStripePaymentAction } from "@/app/[locale]/(app)/payments/actions";
import { getInvoiceById } from "@/lib/queries/invoices";

// Stripe calls this automatically after a successful Checkout payment so the
// invoice can be marked paid without anyone needing to check back manually.
// Configure this URL (https://yourdomain.com/api/webhooks/stripe) in the
// Stripe Dashboard under Developers > Webhooks, listening for
// "checkout.session.completed", then set STRIPE_WEBHOOK_SECRET to the
// signing secret Stripe gives you for that endpoint.
export async function POST(request: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe webhook isn't configured." },
      { status: 503 },
    );
  }

  const stripe = getStripeClient()!;
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature ?? "",
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;
    if (invoiceId) {
      await markInvoicePaidAction(invoiceId, { paymentMethod: "Stripe" });

      // Additive: also log this charge in the Payments ledger. Wrapped so a
      // failure here never affects the invoice already being marked paid.
      try {
        const result = await getInvoiceById(invoiceId);
        if (result) {
          await recordStripePaymentAction({
            invoiceId,
            amountTotal: Number(result.invoice.total),
            transactionConfirmation: session.id,
          });
        }
      } catch (err) {
        console.error("Failed to record Stripe payment ledger entry:", err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
