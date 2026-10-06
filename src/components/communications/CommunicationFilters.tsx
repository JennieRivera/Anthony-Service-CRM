"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CommunicationListFilters } from "@/lib/queries/communications";

// Filters for every Communications tab (the channel is the tab itself).
// They live in the URL, next to ?tab=.
export function CommunicationFilters({
  clients,
  statuses,
  activeFilters,
}: {
  clients: { id: string; fullName: string }[];
  statuses: readonly string[];
  activeFilters: CommunicationListFilters;
}) {
  const t = useTranslations("Communications");
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
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function clearAll() {
    const params = new URLSearchParams();
    const tab = searchParams.get("tab");
    if (tab) params.set("tab", tab);
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  }

  const anyActive = ["clientId", "from", "to", "followUp", "status", "direction"].some(
    (key) => activeFilters[key as keyof CommunicationListFilters],
  );

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
      <div className="flex w-full flex-col gap-1.5 sm:w-56">
        <Label>{t("filterClient")}</Label>
        <Select
          value={activeFilters.clientId ?? "all"}
          onValueChange={(value) => setFilter("clientId", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllClients")}</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="comm-from">{t("filterFrom")}</Label>
        <Input
          id="comm-from"
          type="date"
          className="w-40"
          value={activeFilters.from ?? ""}
          onChange={(e) => setFilter("from", e.target.value || null)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="comm-to">{t("filterTo")}</Label>
        <Input
          id="comm-to"
          type="date"
          className="w-40"
          value={activeFilters.to ?? ""}
          onChange={(e) => setFilter("to", e.target.value || null)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("columnStatus")}</Label>
        <Select
          value={activeFilters.status ?? "all"}
          onValueChange={(value) => setFilter("status", value)}
        >
          <SelectTrigger className="w-44">
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
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>{t("columnDirection")}</Label>
        <Select
          value={activeFilters.direction ?? "all"}
          onValueChange={(value) => setFilter("direction", value)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filterAllDirections")}</SelectItem>
            <SelectItem value="inbound">{tDirection("inbound")}</SelectItem>
            <SelectItem value="outbound">{tDirection("outbound")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <label className="flex h-9 cursor-pointer items-center gap-2 text-sm text-foreground">
        <Checkbox
          checked={activeFilters.followUp === "1"}
          onCheckedChange={(checked) => setFilter("followUp", checked ? "1" : null)}
        />
        {t("filterFollowUp")}
      </label>

      {anyActive && (
        <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
          {t("filterClear")}
        </Button>
      )}
    </div>
  );
}
