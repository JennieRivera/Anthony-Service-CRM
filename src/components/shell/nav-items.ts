import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users, Briefcase } from "lucide-react";

export type NavItem = {
  href: string;
  labelKey: "dashboard" | "clients" | "cases";
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/clients", labelKey: "clients", icon: Users },
  { href: "/cases", labelKey: "cases", icon: Briefcase },
];
