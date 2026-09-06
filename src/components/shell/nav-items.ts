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
  MapPinned,
  UsersRound,
} from "lucide-react";
import { canAccessRoute, type Role } from "@/lib/permissions";

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
    | "latinoBusinessMap"
    | "associations"
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
  { href: "/latino-business-map", labelKey: "latinoBusinessMap", icon: MapPinned },
  { href: "/associations", labelKey: "associations", icon: UsersRound },
  { href: "/settings", labelKey: "settings", icon: Settings },
];

// Multi-staff login — reuses the exact same rules src/proxy.ts enforces
// (via canAccessRoute/ROUTE_ACCESS in @/lib/permissions), so the sidebar
// never shows a link that would just redirect the user away.
//
// Returns hrefs only (plain strings) rather than full NavItem objects:
// NavItem carries a Lucide icon component reference, and those can't
// cross the server→client prop boundary ("Only plain objects can be
// passed to Client Components..."). Sidebar/MobileNav import the full
// navItems list themselves and filter it down to these hrefs.
export function getVisibleNavHrefs(role: Role | null): string[] {
  return navItems
    .filter((item) => canAccessRoute(role, item.href))
    .map((item) => item.href);
}
