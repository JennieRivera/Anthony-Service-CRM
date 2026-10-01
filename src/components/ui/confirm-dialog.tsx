"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmingLabel,
  variant = "destructive",
  onConfirm,
}: {
  trigger: React.ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmingLabel?: string;
  variant?: "destructive" | "default";
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await onConfirm();
                setOpen(false);
              })
            }
          >
            {isPending ? confirmingLabel ?? confirmLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
