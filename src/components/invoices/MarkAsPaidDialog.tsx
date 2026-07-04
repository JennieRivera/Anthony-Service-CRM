"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { markInvoicePaidAction } from "@/app/[locale]/(app)/invoices/actions";

export function MarkAsPaidDialog({ invoiceId }: { invoiceId: string }) {
  const t = useTranslations("Invoices");
  const [open, setOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await markInvoicePaidAction(invoiceId, { paymentMethod });
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <CheckCircle2 className="h-4 w-4" />
        {t("markAsPaid")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("markAsPaid")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="paymentMethod">{t("paymentMethodLabel")}</Label>
          <Input
            id="paymentMethod"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder={t("paymentMethodPlaceholder")}
          />
        </div>
        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={!paymentMethod.trim() || isPending}
          >
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
