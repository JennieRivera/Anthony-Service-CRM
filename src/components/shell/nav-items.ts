import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  CalendarDays,
  Receipt,
  Handshake,
  Wallet,
  ListChecks,
  Network,
  BarChart3,
  Settings,
  Map,
  MessagesSquare,
  NotepadText,
} from "lucide-react";

export type NavItem = {
  href: string;
  labelKey:
    | "dashboard"
    | "clients"
    | "cases"
    | "documents"
    | "appointments"
    | "invoices"
    | "referrals"
    | "payments"
    | "tasks"
    | "alliances"
    | "communications"
    | "templates"
    | "reports"
    | "companyRegistration"
    | "settings";
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/clients", labelKey: "clients", icon: Users },
  { href: "/cases", labelKey: "cases", icon: Briefcase },
  { href: "/tasks", labelKey: "tasks", icon: ListChecks },
  { href: "/appointments", labelKey: "appointments", icon: CalendarDays },
  { href: "/communications", labelKey: "communications", icon: MessagesSquare },
  { href: "/templates", labelKey: "templates", icon: NotepadText },
  { href: "/invoices", labelKey: "invoices", icon: Receipt },
  { href: "/payments", labelKey: "payments", icon: Wallet },
  { href: "/referrals", labelKey: "referrals", icon: Handshake },
  { href: "/alliances", labelKey: "alliances", icon: Network },
  { href: "/documents", labelKey: "documents", icon: FileText },
  { href: "/reports", labelKey: "reports", icon: BarChart3 },
  { href: "/company-registration", labelKey: "companyRegistration", icon: Map },
  { href: "/settings", labelKey: "settings", icon: Settings },
];
