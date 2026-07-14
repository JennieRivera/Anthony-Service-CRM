import { notFound } from "next/navigation";
import { Pencil, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getCaseById } from "@/lib/queries/cases";
import { isBlobConfigured } from "@/lib/blob/config";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CaseStatusBadge } from "@/components/clients/StatusBadge";
import { DocumentList } from "@/components/documents/DocumentList";
import { DocumentUploader } from "@/components/documents/DocumentUploader";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Cases");
  const tService = await getTranslations("ServiceType");
  const tActType = await getTranslations("NotarialActType");
  const tIdMethod = await getTranslations("IdVerificationMethod");
  const tDocuments = await getTranslations("Documents");

  const result = await getCaseById(id);
  if (!result) notFound();

  const { case: c, client, notaryEntries, apostille, documents } = result;

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link href="/cases" className="text-sm text-muted-foreground underline">
          &larr; {t("backToCases")}
        </Link>
        <div className="flex gap-2">
          <Button
            variant="outline"
            render={<a href={`/api/cases/${id}/template/pdf`} />}
          >
            <FileText className="h-4 w-4" />
            {t("generateTemplate")}
          </Button>
          <Button variant="outline" render={<Link href={`/cases/${id}/edit`} />}>
            <Pencil className="h-4 w-4" />
            {t("editCase")}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl text-foreground">{c.title}</h1>
          <CaseStatusBadge status={c.status} />
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("columnClient")}</p>
            <Link
              href={`/clients/${client.id}`}
              className="text-foreground hover:underline"
            >
              {client.fullName}
            </Link>
          </div>
          <div>
            <p className="text-muted-foreground">{t("columnService")}</p>
            <p className="text-foreground">{tService(c.serviceType)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("columnDue")}</p>
            <p className="text-foreground">
              {c.dueDate ? new Date(c.dueDate).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("columnFee")}</p>
            <p className="text-foreground">
              {c.fee ? `$${Number(c.fee).toFixed(2)}` : "—"}
            </p>
          </div>
        </div>
        {c.notes && (
          <div className="text-sm">
            <p className="text-muted-foreground">{t("form.notes")}</p>
            <p className="text-foreground">{c.notes}</p>
          </div>
        )}
      </div>

      {notaryEntries.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-lg text-foreground">
            {t("notaryJournal")}
          </h2>
          {notaryEntries.map((entry) => (
            <div
              key={entry.id}
              className="grid gap-3 border-t border-border pt-3 text-sm first:border-t-0 first:pt-0 sm:grid-cols-4"
            >
              <div>
                <p className="text-muted-foreground">{t("form.dueDate")}</p>
                <p className="text-foreground">
                  {new Date(entry.entryDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t("form.documentType")}
                </p>
                <p className="text-foreground">{entry.documentType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t("form.notarialActType")}
                </p>
                <p className="text-foreground">
                  {tActType(entry.notarialActType)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t("form.idVerificationMethod")}
                </p>
                <p className="text-foreground">
                  {tIdMethod(entry.idVerificationMethod)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {apostille && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
          <h2 className="font-heading text-lg text-foreground">
            {t("apostilleDetails")}
          </h2>
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">
                {t("form.destinationCountry")}
              </p>
              <p className="text-foreground">{apostille.destinationCountry}</p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.instrumentType")}
              </p>
              <p className="text-foreground">{apostille.instrumentType}</p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.submissionDate")}
              </p>
              <p className="text-foreground">
                {apostille.submissionDate
                  ? new Date(apostille.submissionDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.expectedReturnDate")}
              </p>
              <p className="text-foreground">
                {apostille.expectedReturnDate
                  ? new Date(apostille.expectedReturnDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">
                {t("form.actualReturnDate")}
              </p>
              <p className="text-foreground">
                {apostille.actualReturnDate
                  ? new Date(apostille.actualReturnDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-heading text-lg text-foreground">
          {tDocuments("title")}
        </h2>
        {isBlobConfigured() ? (
          <DocumentUploader clientId={client.id} caseId={c.id} />
        ) : (
          <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {tDocuments("notConfigured")}
          </p>
        )}
        <DocumentList documents={documents} />
      </div>
    </div>
  );
}
