import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getPaymentById } from "@/lib/queries/payments";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PaymentStatusBadge } from "@/components/payments/PaymentStatusBadge";

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Payments");
  const tRefund = await getTranslations("RefundStatus");

  const result = await getPaymentById(id);
  if (!result) notFound();

  const { payment, invoiceId, invoiceSeq, invoiceIssueDate, clientId, clientName } =
    result;
  const invoiceNumber = `INV-${String(invoiceSeq).padStart(5, "0")}`;

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/payments"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToPayments")}
        </Link>
        <Button render={<Link href={`/payments/${id}/edit`} />}>
          <Pencil className="h-4 w-4" />
          {t("editPayment")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl text-foreground">
            {invoiceNumber}
          </h1>
          <PaymentStatusBadge status={payment.status} />
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("columnClient")}</p>
            <Link
              href={`/clients/${clientId}`}
              className="text-foreground hover:underline"
            >
              {clientName}
            </Link>
          </div>
          <div>
            <p className="text-muted-foreground">{t("invoiceDate")}</p>
            <p className="text-foreground">
              {new Date(invoiceIssueDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("amountTotal")}</p>
            <Link
              href={`/invoices/${invoiceId}`}
              className="text-foreground hover:underline"
            >
              ${Number(payment.amountTotal).toFixed(2)}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border border-border bg-card p-6 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">{t("form.depositAmount")}</p>
          <p className="text-foreground">
            {payment.depositAmount
              ? `$${Number(payment.depositAmount).toFixed(2)}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("columnPaid")}</p>
          <p className="text-foreground">
            ${Number(payment.amountPaid).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("balanceDue")}</p>
          <p className="text-lg font-medium text-foreground">
            ${Number(payment.balanceDue).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("form.paymentDate")}</p>
          <p className="text-foreground">
            {payment.paymentDate
              ? new Date(payment.paymentDate).toLocaleDateString()
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("form.paymentMethod")}</p>
          <p className="text-foreground">{payment.paymentMethod ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">
            {t("form.transactionConfirmation")}
          </p>
          <p className="text-foreground">
            {payment.transactionConfirmation ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("form.receiptNumber")}</p>
          <p className="text-foreground">{payment.receiptNumber ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("form.refundStatus")}</p>
          <p className="text-foreground">{tRefund(payment.refundStatus)}</p>
        </div>
      </div>
    </div>
  );
}
