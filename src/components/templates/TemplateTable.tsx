import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { MessageTemplate } from "@/lib/db/schema";

export async function TemplateTable({
  templates,
}: {
  templates: MessageTemplate[];
}) {
  const t = await getTranslations("Templates");
  const tChannel = await getTranslations("ConversationChannel");
  const tCategory = await getTranslations("MessageTemplateCategory");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnName")}</TableHead>
            <TableHead>{t("columnCategory")}</TableHead>
            <TableHead>{t("columnLanguage")}</TableHead>
            <TableHead>{t("columnChannel")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnUpdated")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell>
                <Link
                  href={`/templates/${template.id}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {template.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tCategory(template.category)}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {template.language.toUpperCase()}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{tChannel(template.channel)}</Badge>
              </TableCell>
              <TableCell>
                <Badge
                  className={
                    template.active
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground bg-transparent"
                  }
                >
                  {template.active ? t("active") : t("inactive")}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(template.updatedAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
