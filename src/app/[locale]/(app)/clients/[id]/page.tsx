import { notFound } from "next/navigation";
import { Pencil, ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getClientById } from "@/lib/queries/clients";
import { getClientHighlevelSync, getHighLevelSyncPreview } from "@/lib/queries/highlevel";
import { isBlobConfigured } from "@/lib/blob/config";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ClientStatusBadge } from "@/components/clients/StatusBadge";
import { ClientProfileTabs } from "@/components/clients/ClientProfileTabs";
import { ClientDeleteButton } from "@/components/clients/ClientDeleteButton";
import { PortalAccessCard } from "@/components/clients/PortalAccessCard";
import { getDb } from "@/lib/db";
import { getPortalAccessSummary } from "@/lib/portal/access";
import type { PortalDb } from "@/lib/portal/db";

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Clients");
  const tAiEscalations = await getTranslations("AiEscalations");

  const result = await getClientById(id);
  if (!result) notFound();

  const [highlevelSync, highlevelPreview, portalAccess] = await Promise.all([
    getClientHighlevelSync(id),
    getHighLevelSyncPreview(id),
    getPortalAccessSummary(getDb() as unknown as PortalDb, id),
  ]);

  const {
    client,
    cases,
    invoices,
    appointments,
    documents,
    conversations,
    referrals,
    tasks,
    payments,
    outstandingBalance,
    timeline,
    communicationPreferences,
  } = result;

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link href="/clients" className="text-sm text-muted-foreground underline">
          &larr; {t("backToClients")}
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={<Link href={`/ai-escalations/new?clientId=${id}`} />}
          >
            <ShieldAlert className="h-4 w-4" />
            {tAiEscalations("escalateGeneric")}
          </Button>
          <Button variant="outline" render={<Link href={`/clients/${id}/edit`} />}>
            <Pencil className="h-4 w-4" />
            {t("editClient")}
          </Button>
          <ClientDeleteButton clientId={id} />
        </div>
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
            <p className="text-muted-foreground">{t("email")}</p>
            <p className="text-foreground">{client.email ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("phone")}</p>
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
          <div>
            <p className="text-muted-foreground">
              {t("outstandingBalance")}
            </p>
            <p
              className={
                outstandingBalance > 0
                  ? "font-medium text-destructive"
                  : "text-foreground"
              }
            >
              ${outstandingBalance.toFixed(2)}
            </p>
          </div>
        </div>
        {client.notes && (
          <div className="text-sm">
            <p className="text-muted-foreground">{t("notes")}</p>
            <p className="text-foreground">{client.notes}</p>
          </div>
        )}
      </div>

      <PortalAccessCard
        clientId={client.id}
        hasPhone={(client.phone ?? "").replace(/\D/g, "").length >= 4}
        summary={{
          pendingLink: portalAccess.pendingLink
            ? {
                createdAt: portalAccess.pendingLink.createdAt.toISOString(),
                expiresAt: portalAccess.pendingLink.expiresAt.toISOString(),
                locked: portalAccess.pendingLink.locked,
              }
            : null,
          activeSessions: portalAccess.activeSessions,
          lastSeenAt: portalAccess.lastSeenAt ? new Date(portalAccess.lastSeenAt).toISOString() : null,
          lastLoginAt: portalAccess.lastLoginAt ? new Date(portalAccess.lastLoginAt).toISOString() : null,
        }}
      />

      <ClientProfileTabs
        clientId={client.id}
        cases={cases}
        invoices={invoices}
        appointments={appointments}
        documents={documents}
        conversations={conversations}
        referrals={referrals}
        tasks={tasks}
        payments={payments}
        timeline={timeline}
        blobConfigured={isBlobConfigured()}
        communicationPreferences={communicationPreferences}
        highlevelSync={highlevelSync}
        highlevelPreview={highlevelPreview}
      />
    </div>
  );
}
