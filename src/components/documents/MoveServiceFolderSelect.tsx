"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SERVICE_FOLDERS, type Drawer } from "@/lib/validation/documentDrawer";
import { moveDocumentToServiceFolderAction } from "@/app/[locale]/(app)/documents/actions";

const CLIENTS = "clientes";

// "Move to…" — which archive folder (service) a document lives in. A
// document attached to a case can't go to the general Clients folder.
export function MoveServiceFolderSelect({
  documentId,
  current,
  hasCase,
}: {
  documentId: string;
  current: Drawer;
  hasCase: boolean;
}) {
  const t = useTranslations("Documents");
  const tService = useTranslations("ServiceType");
  const tDrawer = useTranslations("DocumentDrawer");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === current) return;
    startTransition(async () => {
      try {
        await moveDocumentToServiceFolderAction(documentId, value === CLIENTS ? null : value);
        toast.success(t("movedTo", { folder: value === CLIENTS ? tDrawer("clientes") : tService(value) }));
        router.refresh();
      } catch {
        toast.error(t("moveError"));
      }
    });
  }

  return (
    <Select value={current} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-auto text-xs" title={t("moveToServiceFolder")} aria-label={t("moveToServiceFolder")}>
        <span className="text-muted-foreground">{t("moveToServiceFolder")}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {!hasCase && <SelectItem value={CLIENTS}>{tDrawer("clientes")}</SelectItem>}
        {SERVICE_FOLDERS.map((s) => (
          <SelectItem key={s} value={s}>
            {tService(s)}
          </SelectItem>
        ))}
        {current === "otros" && <SelectItem value="otros">{tDrawer("otros")}</SelectItem>}
      </SelectContent>
    </Select>
  );
}
