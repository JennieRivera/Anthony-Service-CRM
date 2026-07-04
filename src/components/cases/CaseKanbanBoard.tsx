"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { caseStatusValues } from "@/lib/validation/case";
import { updateCaseStatusAction } from "@/app/[locale]/(app)/cases/actions";

export type CaseCardData = {
  id: string;
  title: string;
  serviceType: string;
  status: (typeof caseStatusValues)[number];
  clientId: string;
  clientName: string;
  fee: string | null;
  dueDate: string | null;
};

function CaseCard({ item }: { item: CaseCardData }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id });
  const tService = useTranslations("ServiceType");

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
          : undefined
      }
      className={cn(
        "flex cursor-grab flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <Link
        href={`/cases/${item.id}`}
        className="font-medium text-foreground hover:underline"
        onClick={(e) => isDragging && e.preventDefault()}
      >
        {item.title}
      </Link>
      <span className="text-sm text-muted-foreground">{item.clientName}</span>
      <div className="flex items-center justify-between">
        <Badge variant="outline">{tService(item.serviceType)}</Badge>
        {item.fee && (
          <span className="text-sm font-medium text-foreground">
            ${Number(item.fee).toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}

function Column({
  status,
  items,
}: {
  status: (typeof caseStatusValues)[number];
  items: CaseCardData[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const t = useTranslations("CaseStatus");

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-3 rounded-lg bg-muted/50 p-3",
        isOver && "bg-muted",
      )}
    >
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-foreground">{t(status)}</h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <CaseCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export function CaseKanbanBoard({ cases }: { cases: CaseCardData[] }) {
  const [items, setItems] = useState(cases);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.id as (typeof caseStatusValues)[number];
    const caseId = String(active.id);
    const current = items.find((i) => i.id === caseId);
    if (!current || current.status === newStatus) return;

    setItems((prev) =>
      prev.map((i) => (i.id === caseId ? { ...i, status: newStatus } : i)),
    );

    startTransition(() => {
      updateCaseStatusAction(caseId, newStatus);
    });
  }

  const activeItem = items.find((i) => i.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {caseStatusValues.map((status) => (
          <Column
            key={status}
            status={status}
            items={items.filter((i) => i.status === status)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem && <CaseCard item={activeItem} />}
      </DragOverlay>
    </DndContext>
  );
}
