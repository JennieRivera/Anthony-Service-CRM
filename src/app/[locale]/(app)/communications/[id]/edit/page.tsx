import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CommunicationForm } from "@/components/communications/CommunicationForm";
import { getCommunicationById } from "@/lib/queries/communications";
import { listClientsForSelect } from "@/lib/queries/cases";
import { listCasesForSelect, listReferralsForSelect } from "@/lib/queries/referrals";
import { updateCommunicationAction } from "../../actions";
import type { CommunicationFormValues } from "@/lib/validation/communication";

export default async function EditCommunicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Communications");
  const [result, clients, cases, referrals] = await Promise.all([
    getCommunicationById(id),
    listClientsForSelect(),
    listCasesForSelect(),
    listReferralsForSelect(),
  ]);

  if (!result) notFound();

  async function submit(values: CommunicationFormValues) {
    "use server";
    await updateCommunicationAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("editCommunication")}
        </h1>
        <Link
          href={`/communications/${id}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToCommunication")}
        </Link>
      </div>

      <CommunicationForm
        communication={result.communication}
        clients={clients}
        cases={cases}
        referrals={referrals}
        onSubmit={submit}
      />
    </div>
  );
}
