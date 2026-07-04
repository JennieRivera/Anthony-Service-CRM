import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getClientById } from "@/lib/queries/clients";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ClientStatusBadge } from "@/components/clients/StatusBadge";
import { ClientProfileTabs } from "@/components/clients/ClientProfileTabs";

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Clients");

  const result = await getClientById(id);
  if (!result) notFound();

  const { client, cases, invoices, appointments } = result;

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link href="/clients" className="text-sm text-muted-foreground underline">
          &larr; {t("backToClients")}
        </Link>
        <Button variant="outline" render={<Link href={`/clients/${id}/edit`} />}>
          <Pencil className="h-4 w-4" />
          {t("editClient")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl text-foreground">
            {client.fullName}
          </h1>
          <ClientStatusBadge status={client.status} />
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="text-foreground">{client.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="text-foreground">{client.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">
              {t("preferredLanguage")}
            </p>
            <p className="text-foreground">
              {client.preferredLanguage === "en" ? "English" : "Español"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("referralSource")}</p>
            <p className="text-foreground">{client.referralSource ?? "—"}</p>
          </div>
        </div>
        {client.notes && (
          <div className="text-sm">
            <p className="text-muted-foreground">{t("notes")}</p>
            <p className="text-foreground">{client.notes}</p>
          </div>
        )}
      </div>

      <ClientProfileTabs
        clientId={client.id}
        cases={cases}
        invoices={invoices}
        appointments={appointments}
      />
    </div>
  );
}
