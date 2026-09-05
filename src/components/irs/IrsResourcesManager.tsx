"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IrsResourceFormDialog } from "./IrsResourceFormDialog";
import {
  createIrsResourceAction,
  updateIrsResourceAction,
  toggleIrsResourceActiveAction,
  deleteIrsResourceAction,
} from "@/app/[locale]/(app)/irs-resources/actions";
import type { IrsResource } from "@/lib/db/schema";

export function IrsResourcesManager({ resources }: { resources: IrsResource[] }) {
  const t = useTranslations("IrsResources");
  const tCategory = useTranslations("IrsResourceCategory");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <IrsResourceFormDialog onSubmit={createIrsResourceAction} />
      </div>

      {resources.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground underline"
                  >
                    {resource.name}
                  </a>
                  <Badge variant="outline">{tCategory(resource.category)}</Badge>
                  {!resource.active && (
                    <Badge variant="outline" className="text-muted-foreground">
                      {t("inactive")}
                    </Badge>
                  )}
                </div>
                {resource.description && (
                  <span className="truncate text-sm text-muted-foreground">
                    {resource.description}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {t("lastVerifiedDate")}:{" "}
                  {resource.lastVerifiedDate
                    ? new Date(resource.lastVerifiedDate).toLocaleDateString()
                    : "—"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() =>
                      toggleIrsResourceActiveAction(resource.id, !resource.active),
                    )
                  }
                >
                  {resource.active ? t("disable") : t("enable")}
                </Button>
                <IrsResourceFormDialog
                  resource={resource}
                  onSubmit={(values) => updateIrsResourceAction(resource.id, values)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(() => deleteIrsResourceAction(resource.id))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
