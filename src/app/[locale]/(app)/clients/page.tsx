import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listClients } from "@/lib/queries/clients";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ClientTable } from "@/components/clients/ClientTable";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import type { Client } from "@/lib/db/schema";

export default async function ClientsPage() {
  const t = await getTranslations("Clients");
  const configured = isDatabaseConfigured();

  let clients: Client[] = [];
  let error: string | null = null;

  if (configured) {
    try {
      clients = await listClients();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("title")}
        </h1>
        <Button render={<Link href="/clients/new" />}>
          <Plus className="h-4 w-4" />
          {t("newClient")}
        </Button>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load clients: {error}.
        </p>
      )}

      {configured && !error && <ClientTable clients={clients} />}
    </div>
  );
}
