import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatDateTime } from "@/lib/dates";
import type { ConversationMessage } from "@/lib/db/schema";

// Phase 2G — read-only, reuses the exact same conversation_messages rows
// already shown on the Communications module and the Client profile
// (fetched once via getClientById, never a second query/table). Channel
// labels come straight from the existing ConversationChannel translation
// map — this never implies Instagram/Facebook/WhatsApp/website chat are
// live integrations, it only names whichever channel staff logged the
// message under, same as the Communications list page already does.
export async function StudentCommunicationsList({
  conversations,
}: {
  conversations: ConversationMessage[];
}) {
  const t = await getTranslations("AcademyStudent360");
  const tChannel = await getTranslations("ConversationChannel");

  if (conversations.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noCommunications")}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {conversations.slice(0, 10).map((c) => (
        <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2.5 text-sm">
          <Badge variant="outline">{tChannel(c.channel)}</Badge>
          <Link href={`/communications/${c.id}`} className="min-w-0 flex-1 truncate text-foreground underline">
            {c.subject || c.summary.slice(0, 60)}
          </Link>
          <span className="text-xs text-muted-foreground">{formatDateTime(c.occurredAt)}</span>
        </li>
      ))}
    </ul>
  );
}
