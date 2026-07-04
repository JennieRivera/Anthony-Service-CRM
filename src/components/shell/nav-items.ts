import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  CalendarDays,
} from "lucide-react";

export type NavItem = {
  href: string;
  labelKey: "dashboard" | "clients" | "cases" | "documents" | "appointments";
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/clients", labelKey: "clients", icon: Users },
  { href: "/cases", labelKey: "cases", icon: Briefcase },
  { href: "/appointments", labelKey: "appointments", icon: CalendarDays },
  { href: "/documents", labelKey: "documents", icon: FileText },
];
