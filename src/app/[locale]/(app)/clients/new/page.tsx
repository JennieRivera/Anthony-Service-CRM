import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ClientForm } from "@/components/clients/ClientForm";
import { createClientAction } from "../actions";

export default async function NewClientPage() {
  const t = await getTranslations("Clients");

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newClient")}
        </h1>
        <Link href="/clients" className="text-sm text-muted-foreground underline">
          &larr; {t("backToClients")}
        </Link>
      </div>

      <ClientForm onSubmit={createClientAction} />
    </div>
  );
}
