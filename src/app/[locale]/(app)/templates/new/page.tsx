import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { createMessageTemplateAction } from "../actions";

export default async function NewTemplatePage() {
  const t = await getTranslations("Templates");

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("newTemplate")}
        </h1>
        <Link href="/templates" className="text-sm text-muted-foreground underline">
          &larr; {t("backToTemplates")}
        </Link>
      </div>

      <TemplateForm onSubmit={createMessageTemplateAction} />
    </div>
  );
}
