"use client";

import { useTranslations } from "next-intl";
import { InlineStatusSelect } from "./InlineStatusSelect";
import {
  metaChannelStatusValues,
  type FacebookThreadFormValues,
} from "@/lib/validation/socialChannels";
import { updateFacebookThreadStatusAction } from "@/app/[locale]/(app)/communications/social-actions";

export function FacebookThreadStatusCell({
  id,
  status,
}: {
  id: string;
  status: FacebookThreadFormValues["status"];
}) {
  const tStatus = useTranslations("MetaChannelStatus");

  return (
    <InlineStatusSelect
      value={status}
      values={metaChannelStatusValues}
      labelFor={(v) => tStatus(v)}
      onChange={(next) => updateFacebookThreadStatusAction(id, next)}
    />
  );
}
