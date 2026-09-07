import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { isBlobConfigured } from "@/lib/blob/config";
import { listAllDocuments, listReferralsForFolders } from "@/lib/queries/documents";
import { listCasesWithClient, listClientsForSelect } from "@/lib/queries/cases";
import { DocumentsCabinet } from "@/components/documents/DocumentsCabinet";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function DocumentsPage() {
  const t = await getTranslations("Documents");
  const configured = isDatabaseConfigured();
  const blobConfigured = isBlobConfigured();

  let documents: Awaited<ReturnType<typeof listAllDocuments>> = [];
  let clients: Awaited<ReturnType<typeof listClientsForSelect>> = [];
  let cases: Awaited<ReturnType<typeof listCasesWithClient>> = [];
  let referrals: Awaited<ReturnType<typeof listReferralsForFolders>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      [documents, clients, cases, referrals] = await Promise.all([
        listAllDocuments(),
        listClientsForSelect(),
        listCasesWithClient(),
        listReferralsForFolders(),
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
        <DocumentsCabinet
          documents={documents}
          clients={clients}
          cases={cases.map((c) => ({
            id: c.id,
            title: c.title,
            clientId: c.clientId,
            serviceType: c.serviceType,
          }))}
          referrals={referrals}
          blobConfigured={blobConfigured}
        />
      )}
    </div>
  );
}
