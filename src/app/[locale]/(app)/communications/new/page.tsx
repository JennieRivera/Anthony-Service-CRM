import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CommunicationForm } from "@/components/communications/CommunicationForm";
import { listClientsForSelect } from "@/lib/queries/cases";
import { listCasesForSelect, listReferralsForSelect } from "@/lib/queries/referrals";
import { getMessageTemplateById } from "@/lib/queries/messageTemplates";
import { createCommunicationAction } from "../actions";

export default async function NewCommunicationPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; caseId?: string; templateId?: string }>;
}) {
  const t = await getTranslations("Communications");
  const { clientId, caseId, templateId } = await searchParams;
  const [clients, cases, referrals, template] = await Promise.all([
    listClientsForSelect(),
    listCasesForSelect(),
    listReferralsForSelect(),
    templateId ? getMessageTemplateById(templateId) : Promise.resolve(null),
  ]);

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newCommunication")}
        </h1>
        <Link
          href="/communications"
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToCommunications")}
        </Link>
      </div>

      <CommunicationForm
        clients={clients}
        cases={cases}
        referrals={referrals}
        defaultClientId={clientId}
        defaultCaseId={caseId}
        template={template}
        onSubmit={createCommunicationAction}
      />
    </div>
  );
}
