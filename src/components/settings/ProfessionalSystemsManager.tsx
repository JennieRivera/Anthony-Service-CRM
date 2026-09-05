"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProfessionalSystemFormDialog } from "./ProfessionalSystemFormDialog";
import {
  createProfessionalSystemAction,
  updateProfessionalSystemAction,
  toggleProfessionalSystemActiveAction,
  reorderProfessionalSystemAction,
} from "@/app/[locale]/(app)/settings/professional-systems/actions";
import type { ProfessionalSystem } from "@/lib/db/schema";

export function ProfessionalSystemsManager({
  systems,
}: {
  systems: ProfessionalSystem[];
}) {
  const t = useTranslations("ProfessionalSystems");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ProfessionalSystemFormDialog onSubmit={createProfessionalSystemAction} />
      </div>

      <div className="flex flex-col gap-2">
        {systems.map((system, index) => (
          <div
            key={system.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4"
          >
            <div className="flex flex-col gap-1">
              <Button
                variant="outline"
                size="icon"
                disabled={index === 0 || isPending}
                onClick={() =>
                  startTransition(() =>
                    reorderProfessionalSystemAction(system.id, "up"),
                  )
                }
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={index === systems.length - 1 || isPending}
                onClick={() =>
                  startTransition(() =>
                    reorderProfessionalSystemAction(system.id, "down"),
                  )
                }
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </div>

            <span className="text-2xl">{system.icon || "🔗"}</span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">
                  {system.name}
                </span>
                <Badge variant="outline">{system.category}</Badge>
                {!system.active && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {t("inactive")}
                  </Badge>
                )}
              </div>
              <span className="truncate text-sm text-muted-foreground">
                {system.url || t("noUrl")}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  startTransition(() =>
                    toggleProfessionalSystemActiveAction(
                      system.id,
                      !system.active,
                    ),
                  )
                }
              >
                {system.active ? t("disable") : t("enable")}
              </Button>
              <ProfessionalSystemFormDialog
                system={system}
                onSubmit={(values) =>
                  updateProfessionalSystemAction(system.id, values)
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
