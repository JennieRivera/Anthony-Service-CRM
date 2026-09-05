"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CommunicationListFilters } from "@/lib/queries/communications";

export function CommunicationFilters({
  channels,
  statuses,
  activeFilters,
}: {
  channels: readonly string[];
  statuses: readonly string[];
  activeFilters: CommunicationListFilters;
}) {
  const t = useTranslations("Communications");
  const tChannel = useTranslations("ConversationChannel");
  const tStatus = useTranslations("CommunicationStatus");
  const tDirection = useTranslations("ConversationDirection");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(key: keyof CommunicationListFilters, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={activeFilters.channel ?? "all"}
        onValueChange={(value) => setFilter("channel", value)}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filterAllChannels")}</SelectItem>
          {channels.map((channel) => (
            <SelectItem key={channel} value={channel}>
              {tChannel(channel)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={activeFilters.status ?? "all"}
        onValueChange={(value) => setFilter("status", value)}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filterAllStatuses")}</SelectItem>
          {statuses.map((status) => (
            <SelectItem key={status} value={status}>
              {tStatus(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={activeFilters.direction ?? "all"}
        onValueChange={(value) => setFilter("direction", value)}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filterAllDirections")}</SelectItem>
          <SelectItem value="inbound">{tDirection("inbound")}</SelectItem>
          <SelectItem value="outbound">{tDirection("outbound")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
