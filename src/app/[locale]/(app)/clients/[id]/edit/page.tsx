import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { ClientForm } from "@/components/clients/ClientForm";
import { listCompaniesForSelect } from "@/lib/queries/companies";
import { updateClientAction } from "../../actions";
import type { ClientFormValues } from "@/lib/validation/client";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Clients");

  const [[client], companies] = await Promise.all([
    getDb().select().from(clients).where(eq(clients.id, id)).limit(1),
    listCompaniesForSelect(),
  ]);

  if (!client) notFound();

  async function submit(values: ClientFormValues) {
    "use server";
    await updateClientAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("editClient")}
        </h1>
        <Link
          href={`/clients/${id}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {client.fullName}
        </Link>
      </div>

      <ClientForm client={client} companies={companies} onSubmit={submit} />
    </div>
  );
}
