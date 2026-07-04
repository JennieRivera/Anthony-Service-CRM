import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CaseForm } from "@/components/cases/CaseForm";
import { listClientsForSelect } from "@/lib/queries/cases";
import { createCaseAction } from "../actions";

export default async function NewCasePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const t = await getTranslations("Cases");
  const { clientId } = await searchParams;
  const clients = await listClientsForSelect();

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newCase")}
        </h1>
        <Link href="/cases" className="text-sm text-muted-foreground underline">
          &larr; {t("backToCases")}
        </Link>
      </div>

      <CaseForm
        clients={clients}
        defaultClientId={clientId}
        onSubmit={createCaseAction}
      />
    </div>
  );
}
