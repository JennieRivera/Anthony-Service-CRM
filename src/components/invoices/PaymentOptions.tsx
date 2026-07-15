import { getTranslations } from "next-intl/server";
import { CreditCard, Wallet, Landmark } from "lucide-react";
import { businessInfo } from "@/lib/business-info";
import { isStripeConfigured } from "@/lib/payments/stripe";
import { Button } from "@/components/ui/button";
import type { Invoice } from "@/lib/db/schema";

export async function PaymentOptions({ invoice }: { invoice: Invoice }) {
  const t = await getTranslations("Invoices");

  if (invoice.status === "paid" || invoice.status === "cancelled") {
    return null;
  }

  const total = Number(invoice.total).toFixed(2);
  const stripeReady = isStripeConfigured();
  const paypalUrl = businessInfo.paypalMeHandle
    ? `https://paypal.me/${businessInfo.paypalMeHandle}/${total}`
    : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
      <h2 className="font-heading text-lg text-foreground">
        {t("payOnline")}
      </h2>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {stripeReady ? (
          <Button
            render={<a href={`/api/invoices/${invoice.id}/pay/stripe`} />}
          >
            <CreditCard className="h-4 w-4" />
            {t("payWithCard")}
          </Button>
        ) : (
          <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            {t("stripeNotConfigured")}
          </p>
        )}

        {paypalUrl && (
          <Button
            variant="outline"
            render={<a href={paypalUrl} target="_blank" rel="noreferrer" />}
          >
            <Wallet className="h-4 w-4" />
            {t("payWithPaypal")}
          </Button>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-md border border-dashed border-border p-3 text-sm">
        <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-foreground">
            {t("payWithZelle")}: <strong>{businessInfo.zelleContact}</strong>
          </p>
          <p className="text-muted-foreground">
            {t("zelleInstructions", { total: `$${total}` })}
          </p>
        </div>
      </div>
    </div>
  );
}
