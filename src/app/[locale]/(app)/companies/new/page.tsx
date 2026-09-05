import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { createCompanyAction } from "../actions";

export default async function NewCompanyPage() {
  const t = await getTranslations("Companies");

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newCompany")}
        </h1>
        <Link href="/companies" className="text-sm text-muted-foreground underline">
          &larr; {t("backToCompanies")}
        </Link>
      </div>

      <CompanyForm onSubmit={createCompanyAction} />
    </div>
  );
}
