"use client";

import { useTranslations } from "next-intl";
import { InlineStatusSelect } from "./InlineStatusSelect";
import { communicationStatusValues } from "@/lib/validation/communication";
import type { WebsiteChatSessionFormValues } from "@/lib/validation/socialChannels";
import { updateWebsiteChatStatusAction } from "@/app/[locale]/(app)/communications/social-actions";

export function WebsiteChatStatusCell({
  id,
  status,
}: {
  id: string;
  status: WebsiteChatSessionFormValues["conversationStatus"];
}) {
  const tStatus = useTranslations("CommunicationStatus");

  return (
    <InlineStatusSelect
      value={status}
      values={communicationStatusValues}
      labelFor={(v) => tStatus(v)}
      onChange={(next) => updateWebsiteChatStatusAction(id, next)}
    />
  );
}
