"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Mail,
  Phone,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  Camera,
  Globe,
  Zap,
  MapPin,
  MoreHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommunicationStatusBadge } from "@/components/communications/CommunicationStatusBadge";
import { communicationChannelValues } from "@/lib/validation/communication";
import type { ConversationMessage, Case } from "@/lib/db/schema";

// Phase 4, Session 1 — every conversation_channel enum value needs an entry
// here or this Record indexing fails to type-check. lucide-react doesn't
// ship trademarked brand logos (no Facebook/Instagram icon), so those two
// use generic stand-ins instead.
const channelIcons = {
  email: Mail,
  call: Phone,
  whatsapp: MessageCircle,
  sms: MessageSquare,
  facebook_messenger: MessageSquareText,
  instagram_dm: Camera,
  website_chat: Globe,
  highlevel: Zap,
  in_person: MapPin,
  other: MoreHorizontal,
} as const;

export function ConversationTimeline({
  conversations,
  cases,
}: {
  conversations: ConversationMessage[];
  cases: Case[];
}) {
  const t = useTranslations("Conversations");
  const tChannel = useTranslations("ConversationChannel");

  const [channelFilter, setChannelFilter] = useState("all");
  const [caseFilter, setCaseFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const caseById = useMemo(
    () => new Map(cases.map((c) => [c.id, c])),
    [cases],
  );

  // Single pass over the one conversations array passed in — every filter
  // narrows this same list, so a communication can never appear twice.
  const filtered = useMemo(() => {
    return conversations.filter((entry) => {
      if (channelFilter !== "all" && entry.channel !== channelFilter) {
        return false;
      }
      if (caseFilter === "none" && entry.caseId) return false;
      if (
        caseFilter !== "all" &&
        caseFilter !== "none" &&
        entry.caseId !== caseFilter
      ) {
        return false;
      }
      // No populated staff/user table yet (single-admin login) — every
      // communication is effectively "unassigned" today, so this filter
      // is structural groundwork rather than something that narrows
      // results right now.
      if (assignedFilter === "unassigned" && entry.assignedUserId) {
        return false;
      }
      const occurred = new Date(entry.occurredAt);
      if (fromDate && occurred < new Date(fromDate)) return false;
      if (toDate && occurred > new Date(`${toDate}T23:59:59`)) return false;
      return true;
    });
  }, [conversations, channelFilter, caseFilter, assignedFilter, fromDate, toDate]);

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        {t("whatsappNotConnected")}
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <Label>{t("filterChannel")}</Label>
          <Select
            value={channelFilter}
            onValueChange={(value) => setChannelFilter(value ?? "all")}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAllChannels")}</SelectItem>
              {communicationChannelValues.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {tChannel(channel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("filterService")}</Label>
          <Select
            value={caseFilter}
            onValueChange={(value) => setCaseFilter(value ?? "all")}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAllServices")}</SelectItem>
              <SelectItem value="none">{t("filterNoService")}</SelectItem>
              {cases.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("filterAssignedUser")}</Label>
          <Select
            value={assignedFilter}
            onValueChange={(value) => setAssignedFilter(value ?? "all")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filterAllAssigned")}</SelectItem>
              <SelectItem value="unassigned">
                {t("filterUnassigned")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="conv-from-date">{t("filterFrom")}</Label>
          <Input
            id="conv-from-date"
            type="date"
            className="w-40"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="conv-to-date">{t("filterTo")}</Label>
          <Input
            id="conv-to-date"
            type="date"
            className="w-40"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">
          {conversations.length === 0 ? t("empty") : t("noFilterResults")}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {filtered.map((entry) => {
            const ChannelIcon = channelIcons[entry.channel];
            const DirectionIcon =
              entry.direction === "inbound" ? ArrowDownLeft : ArrowUpRight;
            const relatedCase = entry.caseId
              ? caseById.get(entry.caseId)
              : undefined;
            return (
              <li key={entry.id} className="flex flex-col gap-1.5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ChannelIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Badge variant="outline">{tChannel(entry.channel)}</Badge>
                    <DirectionIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {entry.subject && (
                      <span className="font-medium text-foreground">
                        {entry.subject}
                      </span>
                    )}
                    {relatedCase && (
                      <Badge variant="outline">{relatedCase.title}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <CommunicationStatusBadge status={entry.status} />
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.occurredAt).toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-foreground">{entry.summary}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {entry.counterpart && <span>{entry.counterpart}</span>}
                  {entry.durationMinutes != null && (
                    <span>
                      {t("durationMinutesValue", {
                        minutes: entry.durationMinutes,
                      })}
                    </span>
                  )}
                  <span>
                    {t("columnAssignedUser")}: {entry.assignedUserId ?? "—"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
