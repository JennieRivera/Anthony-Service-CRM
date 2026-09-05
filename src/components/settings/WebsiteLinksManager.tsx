"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WebsiteLinkFormDialog } from "./WebsiteLinkFormDialog";
import {
  createWebsiteLinkAction,
  updateWebsiteLinkAction,
  toggleWebsiteLinkActiveAction,
  reorderWebsiteLinkAction,
} from "@/app/[locale]/(app)/settings/websites/actions";
import type { WebsiteLink } from "@/lib/db/schema";

export function WebsiteLinksManager({ websites }: { websites: WebsiteLink[] }) {
  const t = useTranslations("MyWebsites");
  const tStatus = useTranslations("WebsiteLinkStatus");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <WebsiteLinkFormDialog onSubmit={createWebsiteLinkAction} />
      </div>

      <div className="flex flex-col gap-2">
        {websites.map((website, index) => (
          <div
            key={website.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={index === 0 || isPending}
                onClick={() =>
                  startTransition(() => reorderWebsiteLinkAction(website.id, "up"))
                }
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={index === websites.length - 1 || isPending}
                onClick={() =>
                  startTransition(() => reorderWebsiteLinkAction(website.id, "down"))
                }
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">
                  {website.name}
                </span>
                <Badge variant="outline">{tStatus(website.status)}</Badge>
                {!website.active && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {t("inactive")}
                  </Badge>
                )}
              </div>
              <span className="truncate text-sm text-muted-foreground">
                {website.url}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  startTransition(() =>
                    toggleWebsiteLinkActiveAction(website.id, !website.active),
                  )
                }
              >
                {website.active ? t("disable") : t("enable")}
              </Button>
              <WebsiteLinkFormDialog
                website={website}
                onSubmit={(values) => updateWebsiteLinkAction(website.id, values)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
