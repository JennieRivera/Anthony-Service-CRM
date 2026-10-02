"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ClientStatusBadge } from "@/components/clients/StatusBadge";
import type { ClientDuplicateMatch } from "@/lib/queries/clients";

const MATCH_REASON_KEY: Record<ClientDuplicateMatch["matchReasons"][number], string> = {
  email: "matchEmail",
  phone: "matchPhone",
  name: "matchName",
};

// Phase 2A — Master Person Identity Safety Net. Shared presentational list
// for findPossibleDuplicateClients() results, reused by the New Client
// duplicate-warning dialog, the Academy New Student search, and Diamond
// Community's non-student member entry — one card layout, three different
// sets of actions (each caller decides what "pick this match" means for it).
export function DuplicateMatchList({
  matches,
  renderActions,
}: {
  matches: ClientDuplicateMatch[];
  renderActions: (match: ClientDuplicateMatch) => ReactNode;
}) {
  const t = useTranslations("DuplicateMatch");
  const tService = useTranslations("ServiceType");

  return (
    <div className="flex flex-col gap-2">
      {matches.map((match) => (
        <div
          key={match.id}
          className="flex flex-col gap-2 rounded-md border border-border p-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{match.fullName}</span>
              <span className="text-xs text-muted-foreground">
                {[match.email, match.phone].filter(Boolean).join(" · ") || "—"}
              </span>
            </div>
            <ClientStatusBadge status={match.status} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {match.matchReasons.map((reason) => (
              <Badge key={reason} variant="outline" className="text-xs">
                {t(MATCH_REASON_KEY[reason])}
              </Badge>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {t("servicesLabel")}:{" "}
            {match.services.length > 0
              ? match.services.map((s) => tService(s)).join(", ")
              : t("noServices")}
          </p>

          <div className="flex flex-wrap justify-end gap-2">
            {renderActions(match)}
          </div>
        </div>
      ))}
    </div>
  );
}
