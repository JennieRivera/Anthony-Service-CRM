import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listCasesWithClient } from "@/lib/queries/cases";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import { CasesView } from "@/components/cases/CasesView";
import type { CaseCardData } from "@/components/cases/CaseKanbanBoard";

export default async function CasesPage() {
  const t = await getTranslations("Cases");
  const configured = isDatabaseConfigured();

  let cases: CaseCardData[] = [];
  let error: string | null = null;

  if (configured) {
    try {
      const rows = await listCasesWithClient();
      cases = rows.map((row) => ({
        id: row.id,
        title: row.title,
        serviceType: row.serviceType,
        status: row.status,
        clientId: row.clientId,
        clientName: row.clientName,
        fee: row.fee,
        dueDate: row.dueDate,
      }));
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
        <Button render={<Link href="/cases/new" />}>
          <Plus className="h-4 w-4" />
          {t("newCase")}
        </Button>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load cases: {error}.
        </p>
      )}

      {configured && !error && (
        <>
          {cases.length === 0 ? (
            <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <CasesView cases={cases} />
          )}
        </>
      )}
    </div>
  );
}
