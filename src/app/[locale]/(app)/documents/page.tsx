import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { isBlobConfigured } from "@/lib/blob/config";
import { listAllDocuments } from "@/lib/queries/documents";
import { listCasesWithClient, listClientsForSelect } from "@/lib/queries/cases";
import { DocumentsBrowser } from "@/components/documents/DocumentsBrowser";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function DocumentsPage() {
  const t = await getTranslations("Documents");
  const configured = isDatabaseConfigured();
  const blobConfigured = isBlobConfigured();

  let rows: Awaited<ReturnType<typeof listAllDocuments>> = [];
  let clients: Awaited<ReturnType<typeof listClientsForSelect>> = [];
  let cases: Awaited<ReturnType<typeof listCasesWithClient>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      [rows, clients, cases] = await Promise.all([
        listAllDocuments(),
        listClientsForSelect(),
        listCasesWithClient(),
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load documents: {error}.
        </p>
      )}

      {configured && !error && !blobConfigured && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {t("notConfigured")}
        </p>
      )}

      {configured && !error && (
        <DocumentsBrowser
          documents={rows}
          clients={clients}
          cases={cases.map((c) => ({ id: c.id, title: c.title, clientId: c.clientId }))}
          blobConfigured={blobConfigured}
        />
      )}
    </div>
  );
}
