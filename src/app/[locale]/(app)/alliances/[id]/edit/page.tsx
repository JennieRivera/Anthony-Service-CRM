import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAllianceById } from "@/lib/queries/alliances";
import { Link } from "@/i18n/navigation";
import { AllianceForm } from "@/components/alliances/AllianceForm";
import { updateAllianceAction } from "../../actions";
import type { AllianceFormValues } from "@/lib/validation/alliance";

export default async function EditAlliancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Alliances");

  const result = await getAllianceById(id);
  if (!result) notFound();

  async function submit(values: AllianceFormValues) {
    "use server";
    await updateAllianceAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("editAlliance")}
        </h1>
        <Link
          href={`/alliances/${id}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {result.alliance.organizationName}
        </Link>
      </div>

      <AllianceForm alliance={result.alliance} onSubmit={submit} />
    </div>
  );
}
