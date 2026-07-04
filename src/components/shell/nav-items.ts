import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Users, Briefcase } from "lucide-react";

export type NavItem = {
  href: string;
  labelKey: "dashboard" | "contacts" | "deals";
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/contacts", labelKey: "contacts", icon: Users },
  { href: "/deals", labelKey: "deals", icon: Briefcase },
];
