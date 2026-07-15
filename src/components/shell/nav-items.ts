import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  CalendarDays,
  Receipt,
  BarChart3,
  Settings,
  Map,
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
    | "reports"
    | "companyRegistration"
    | "settings";
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/clients", labelKey: "clients", icon: Users },
  { href: "/cases", labelKey: "cases", icon: Briefcase },
  { href: "/appointments", labelKey: "appointments", icon: CalendarDays },
  { href: "/invoices", labelKey: "invoices", icon: Receipt },
  { href: "/documents", labelKey: "documents", icon: FileText },
  { href: "/reports", labelKey: "reports", icon: BarChart3 },
  { href: "/company-registration", labelKey: "companyRegistration", icon: Map },
  { href: "/settings", labelKey: "settings", icon: Settings },
];
