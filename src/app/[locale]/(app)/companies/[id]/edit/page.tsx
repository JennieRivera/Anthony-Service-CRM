import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { getCompanyById } from "@/lib/queries/companies";
import { updateCompanyAction } from "../../actions";
import type { CompanyFormValues } from "@/lib/validation/company";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Companies");

  const result = await getCompanyById(id);
  if (!result) notFound();

  async function submit(values: CompanyFormValues) {
    "use server";
    await updateCompanyAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("editCompany")}
        </h1>
        <Link
          href={`/companies/${id}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {result.company.legalBusinessName}
        </Link>
      </div>

      <CompanyForm company={result.company} onSubmit={submit} />
    </div>
  );
}
