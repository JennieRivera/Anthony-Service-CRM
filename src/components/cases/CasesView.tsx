"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutGrid, List as ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CaseKanbanBoard, type CaseCardData } from "./CaseKanbanBoard";
import { CaseList } from "./CaseList";

export function CasesView({ cases }: { cases: CaseCardData[] }) {
  const t = useTranslations("Cases");
  const [view, setView] = useState<"kanban" | "list">("kanban");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === "kanban" ? "default" : "outline"}
          onClick={() => setView("kanban")}
          className={cn(view === "kanban" && "pointer-events-none")}
        >
          <LayoutGrid className="h-4 w-4" />
          {t("viewKanban")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "list" ? "default" : "outline"}
          onClick={() => setView("list")}
          className={cn(view === "list" && "pointer-events-none")}
        >
          <ListIcon className="h-4 w-4" />
          {t("viewList")}
        </Button>
      </div>

      {view === "kanban" ? (
        <CaseKanbanBoard cases={cases} />
      ) : (
        <CaseList cases={cases} />
      )}
    </div>
  );
}
