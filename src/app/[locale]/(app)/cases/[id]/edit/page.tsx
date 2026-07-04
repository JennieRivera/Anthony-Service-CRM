import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCaseById, listClientsForSelect } from "@/lib/queries/cases";
import { Link } from "@/i18n/navigation";
import { CaseForm } from "@/components/cases/CaseForm";
import { updateCaseAction } from "../../actions";
import type { CaseFormValues } from "@/lib/validation/case";

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Cases");

  const [result, clients] = await Promise.all([
    getCaseById(id),
    listClientsForSelect(),
  ]);

  if (!result) notFound();

  async function submit(values: CaseFormValues) {
    "use server";
    await updateCaseAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("editCase")}
        </h1>
        <Link
          href={`/cases/${id}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {result.case.title}
        </Link>
      </div>

      <CaseForm caseRecord={result.case} clients={clients} onSubmit={submit} />
    </div>
  );
}
