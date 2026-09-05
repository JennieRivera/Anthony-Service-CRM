import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { listInvoicesForSelect } from "@/lib/queries/payments";
import { createPaymentAction } from "../actions";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string }>;
}) {
  const t = await getTranslations("Payments");
  const { invoiceId } = await searchParams;
  const invoices = await listInvoicesForSelect();

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newPayment")}
        </h1>
        <Link
          href="/payments"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToPayments")}
        </Link>
      </div>

      <PaymentForm
        invoices={invoices}
        defaultInvoiceId={invoiceId}
        onSubmit={createPaymentAction}
      />
    </div>
  );
}
