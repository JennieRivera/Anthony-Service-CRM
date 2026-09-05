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
  Building2,
  Landmark,
  Library,
  FileStack,
} from "lucide-react";

export type NavItem = {
  href: string;
  labelKey:
    | "dashboard"
    | "clients"
    | "companies"
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
    | "salesTaxMap"
    | "irsResources"
    | "immigrationForms"
    | "settings";
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/clients", labelKey: "clients", icon: Users },
  { href: "/companies", labelKey: "companies", icon: Building2 },
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
  { href: "/sales-tax-map", labelKey: "salesTaxMap", icon: Landmark },
  { href: "/irs-resources", labelKey: "irsResources", icon: Library },
  { href: "/immigration-forms", labelKey: "immigrationForms", icon: FileStack },
  { href: "/settings", labelKey: "settings", icon: Settings },
];
