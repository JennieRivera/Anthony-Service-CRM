import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  listCommunicationsWithClient,
  type CommunicationListFilters,
} from "@/lib/queries/communications";
import {
  communicationChannelValues,
  communicationStatusValues,
} from "@/lib/validation/communication";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CommunicationTable } from "@/components/communications/CommunicationTable";
import { CommunicationFilters } from "@/components/communications/CommunicationFilters";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<CommunicationListFilters>;
}) {
  const t = await getTranslations("Communications");
  const configured = isDatabaseConfigured();
  const filters = await searchParams;

  let communications: Awaited<ReturnType<typeof listCommunicationsWithClient>> =
    [];
  let error: string | null = null;

  if (configured) {
    try {
      communications = await listCommunicationsWithClient(filters);
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <Button render={<Link href="/communications/new" />}>
          <Plus className="h-4 w-4" />
          {t("newCommunication")}
        </Button>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured && (
        <CommunicationFilters
          channels={communicationChannelValues}
          statuses={communicationStatusValues}
          activeFilters={filters}
        />
      )}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load communications: {error}.
        </p>
      )}

      {configured && !error && (
        <>
          {communications.length === 0 ? (
            <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <CommunicationTable communications={communications} />
          )}
        </>
      )}
    </div>
  );
}
