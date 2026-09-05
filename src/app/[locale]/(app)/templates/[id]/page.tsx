import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getMessageTemplateById } from "@/lib/queries/messageTemplates";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("Templates");
  const tChannel = await getTranslations("ConversationChannel");
  const tCategory = await getTranslations("MessageTemplateCategory");

  const template = await getMessageTemplateById(id);
  if (!template) notFound();

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link href="/templates" className="text-sm text-muted-foreground underline">
          &larr; {t("backToTemplates")}
        </Link>
        <Button render={<Link href={`/templates/${id}/edit`} />}>
          <Pencil className="h-4 w-4" />
          {t("editTemplate")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-heading text-2xl text-foreground">
            {template.name}
          </h1>
          <Badge
            className={
              template.active
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border text-muted-foreground bg-transparent"
            }
          >
            {template.active ? t("active") : t("inactive")}
          </Badge>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("form.category")}</p>
            <p className="text-foreground">{tCategory(template.category)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.language")}</p>
            <p className="text-foreground">{template.language.toUpperCase()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.channel")}</p>
            <p className="text-foreground">{tChannel(template.channel)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("columnUpdated")}</p>
            <p className="text-foreground">
              {new Date(template.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {template.subject && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm">
          <p className="text-muted-foreground">{t("form.subject")}</p>
          <p className="text-foreground">{template.subject}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6 text-sm">
        <p className="text-muted-foreground">{t("form.messageBody")}</p>
        <p className="whitespace-pre-wrap text-foreground">
          {template.messageBody}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 text-sm">
        <p className="text-muted-foreground">{t("createdBy")}</p>
        <p className="text-foreground">{template.createdByEmail ?? "—"}</p>
      </div>
    </div>
  );
}
