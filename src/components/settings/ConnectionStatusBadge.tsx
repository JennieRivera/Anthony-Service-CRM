import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { ProfessionalSystem } from "@/lib/db/schema";

export type EffectiveConnectionStatus =
  | "integrated"
  | "external_link"
  | "setup_required"
  | "disconnected"
  | "error";

// Phase 1 (AMS CRM V2 master prompt sections 18-19, approval items 11-13) —
// derives what the badge SHOULD say from the two fields that already exist
// on professionalSystems, without touching any row's actual data (approval
// item 13 explicitly forbids a data cleanup in Phase 1). The one rule that
// matters most: integrationType "external_link" (or connectionStatus
// "link_only") always reads as External Link, even on a row whose
// connectionStatus says "connected" — that's exactly the "HighLevel /
// Academy" + 3 other existing rows (Tax/Bookkeeping/Consulting Software)
// found during the Phase 1 inventory, and this function is what stops a
// link from ever being presented as a real API integration.
export function getEffectiveConnectionStatus(
  connectionStatus: ProfessionalSystem["connectionStatus"],
  integrationType: ProfessionalSystem["integrationType"],
): EffectiveConnectionStatus {
  if (connectionStatus === "error") return "error";

  if (integrationType === "external_link" || connectionStatus === "link_only") {
    return "external_link";
  }

  if (
    connectionStatus === "connected" &&
    (integrationType === "api" || integrationType === "webhook" || integrationType === "oauth")
  ) {
    return "integrated";
  }

  if (connectionStatus === "api_available" || connectionStatus === "webhook_available") {
    return "setup_required";
  }

  if (connectionStatus === "not_connected") {
    return integrationType === "unknown" || integrationType === "manual"
      ? "setup_required"
      : "disconnected";
  }

  return "setup_required";
}

const STATUS_CLASSES: Record<EffectiveConnectionStatus, string> = {
  integrated: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  external_link: "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  setup_required: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  disconnected: "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
  error: "border-transparent bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
};

export function ConnectionStatusBadge({
  connectionStatus,
  integrationType,
}: {
  connectionStatus: ProfessionalSystem["connectionStatus"];
  integrationType: ProfessionalSystem["integrationType"];
}) {
  const t = useTranslations("ProfessionalSystems");
  const effective = getEffectiveConnectionStatus(connectionStatus, integrationType);

  return (
    <Badge className={STATUS_CLASSES[effective]}>
      {t(`effectiveStatus.${effective}`)}
    </Badge>
  );
}
