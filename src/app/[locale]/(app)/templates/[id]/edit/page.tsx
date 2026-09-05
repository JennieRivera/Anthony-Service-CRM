import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { getMessageTemplateById } from "@/lib/queries/messageTemplates";
import { updateMessageTemplateAction } from "../../actions";
import type { MessageTemplateFormValues } from "@/lib/validation/messageTemplate";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Templates");

  const template = await getMessageTemplateById(id);
  if (!template) notFound();

  async function submit(values: MessageTemplateFormValues) {
    "use server";
    await updateMessageTemplateAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("editTemplate")}
        </h1>
        <Link
          href={`/templates/${id}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {template.name}
        </Link>
      </div>

      <TemplateForm template={template} onSubmit={submit} />
    </div>
  );
}
