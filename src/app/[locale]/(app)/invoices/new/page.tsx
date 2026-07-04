import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { listClientsForSelect } from "@/lib/queries/cases";
import { createInvoiceAction } from "../actions";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const t = await getTranslations("Invoices");
  const { clientId } = await searchParams;
  const clients = await listClientsForSelect();

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newInvoice")}
        </h1>
        <Link
          href="/invoices"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToInvoices")}
        </Link>
      </div>

      <InvoiceForm
        clients={clients}
        defaultClientId={clientId}
        onSubmit={createInvoiceAction}
      />
    </div>
  );
}
