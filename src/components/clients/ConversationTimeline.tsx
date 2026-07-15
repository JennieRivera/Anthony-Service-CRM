"use client";

import { useTranslations } from "next-intl";
import { Mail, Phone, MessageCircle, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ConversationMessage } from "@/lib/db/schema";

const channelIcons = {
  email: Mail,
  call: Phone,
  whatsapp: MessageCircle,
} as const;

export function ConversationTimeline({
  conversations,
}: {
  conversations: ConversationMessage[];
}) {
  const t = useTranslations("Conversations");
  const tChannel = useTranslations("ConversationChannel");

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {t("whatsappNotConnected")}
      </p>

      {conversations.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {conversations.map((entry) => {
            const ChannelIcon = channelIcons[entry.channel];
            const DirectionIcon =
              entry.direction === "inbound" ? ArrowDownLeft : ArrowUpRight;
            return (
              <li key={entry.id} className="flex flex-col gap-1.5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ChannelIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Badge variant="outline">{tChannel(entry.channel)}</Badge>
                    <DirectionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {entry.subject && (
                      <span className="font-medium text-foreground">
                        {entry.subject}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(entry.occurredAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-foreground">{entry.summary}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {entry.counterpart && <span>{entry.counterpart}</span>}
                  {entry.durationMinutes != null && (
                    <span>
                      {t("durationMinutesValue", {
                        minutes: entry.durationMinutes,
                      })}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
