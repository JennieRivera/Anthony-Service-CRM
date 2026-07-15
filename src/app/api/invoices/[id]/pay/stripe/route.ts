import { NextResponse } from "next/server";
import { getInvoiceById } from "@/lib/queries/invoices";
import { getStripeClient, isStripeConfigured } from "@/lib/payments/stripe";
import { businessInfo } from "@/lib/business-info";

// Public route: this is the link a client clicks to pay their invoice.
// They are not signed into the CRM, so no auth check here on purpose.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Online card payment isn't configured yet." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const result = await getInvoiceById(id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { invoice } = result;

  if (invoice.status === "paid" || invoice.status === "cancelled") {
    return NextResponse.json(
      { error: "This invoice is no longer payable." },
      { status: 400 },
    );
  }

  const invoiceNumber = `INV-${String(invoice.invoiceSeq).padStart(5, "0")}`;
  const origin = new URL(request.url).origin;
  const stripe = getStripeClient()!;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${businessInfo.name} — ${invoiceNumber}`,
          },
          unit_amount: Math.round(Number(invoice.total) * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: id,
    },
    success_url: `${origin}/invoices/${id}?payment=success`,
    cancel_url: `${origin}/invoices/${id}?payment=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Could not start checkout." },
      { status: 502 },
    );
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
