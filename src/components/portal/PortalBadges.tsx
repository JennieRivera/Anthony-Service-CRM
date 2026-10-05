import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { portalAppointmentStatus, portalCaseStatus } from "@/lib/portal/display";

const tone = {
  neutral: "bg-secondary text-secondary-foreground",
  attention: "bg-accent text-accent-foreground ring-1 ring-primary/40",
  done: "bg-primary/10 text-foreground",
  muted: "bg-muted text-muted-foreground",
};

function Pill({ children, variant }: { children: React.ReactNode; variant: keyof typeof tone }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tone[variant])}>
      {children}
    </span>
  );
}

export async function CaseStatusPill({ status }: { status: string }) {
  const t = await getTranslations("Portal.caseStatus");
  const s = portalCaseStatus(status);
  const variant = s === "waiting_on_you" ? "attention" : s === "completed" ? "done" : s === "closed" ? "muted" : "neutral";
  return <Pill variant={variant}>{t(s)}</Pill>;
}

export async function AppointmentStatusPill({ status }: { status: string }) {
  const t = await getTranslations("Portal.appointmentStatus");
  const s = portalAppointmentStatus(status);
  const variant = s === "pending" ? "attention" : s === "confirmed" ? "neutral" : s === "completed" ? "done" : "muted";
  return <Pill variant={variant}>{t(s)}</Pill>;
}
