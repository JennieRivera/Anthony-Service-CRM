"use client";

import { useTranslations } from "next-intl";
import { InlineStatusSelect } from "./InlineStatusSelect";
import {
  metaChannelStatusValues,
  type InstagramThreadFormValues,
} from "@/lib/validation/socialChannels";
import { updateInstagramThreadStatusAction } from "@/app/[locale]/(app)/communications/social-actions";

export function InstagramThreadStatusCell({
  id,
  status,
}: {
  id: string;
  status: InstagramThreadFormValues["status"];
}) {
  const tStatus = useTranslations("MetaChannelStatus");

  return (
    <InlineStatusSelect
      value={status}
      values={metaChannelStatusValues}
      labelFor={(v) => tStatus(v)}
      onChange={(next) => updateInstagramThreadStatusAction(id, next)}
    />
  );
}
