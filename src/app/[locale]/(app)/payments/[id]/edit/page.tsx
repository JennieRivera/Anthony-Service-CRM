import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { listInvoicesForSelect } from "@/lib/queries/payments";
import { updatePaymentAction } from "../../actions";
import type { PaymentFormValues } from "@/lib/validation/payment";

export default async function EditPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Payments");

  const [payment] = await getDb()
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);

  if (!payment) notFound();

  const invoices = await listInvoicesForSelect();

  async function submit(values: PaymentFormValues) {
    "use server";
    await updatePaymentAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("editPayment")}
        </h1>
        <Link
          href={`/payments/${id}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToPayments")}
        </Link>
      </div>

      <PaymentForm payment={payment} invoices={invoices} onSubmit={submit} />
    </div>
  );
}
