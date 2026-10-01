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
  BarChart3,
  Settings,
  MessagesSquare,
  NotepadText,
  Building2,
  Layers,
  Sparkles,
} from "lucide-react";

export type NavItem = {
  kind: "link";
  href: string;
  labelKey:
    | "dashboard"
    | "clients"
    | "companies"
    | "cases"
    | "documents"
    | "calendar"
    | "invoices"
    | "referrals"
    | "payments"
    | "tasks"
    | "communications"
    | "templates"
    | "reports"
    | "settings";
  icon: LucideIcon;
};

export type NavDrawerTrigger = {
  kind: "drawer";
  drawer: "services" | "ecosystem";
  labelKey: "services" | "amsEcosystem";
  icon: LucideIcon;
};

export type NavEntry = NavItem | NavDrawerTrigger;

export type NavGroup = {
  labelKey:
    | "groupHome"
    | "groupBusiness"
    | "groupWorkspace"
    | "groupFinance"
    | "groupReporting"
    | "groupAdministration";
  items: NavItem[];
};

// SIDEBAR-REORG-PLAN (Phase 1, AMS CRM V2 master prompt section 3) — every
// route below already existed under the old flat nav-items.ts list; this
// file only changes how they're grouped/labeled, never adds or removes a
// route. "calendar" reuses the existing /appointments route and data model
// untouched — only the sidebar's own label changes (see AppointmentCalendar
// and the Appointments module itself, neither of which this file touches).
// Items that moved into the two slide-out drawers (Academy, Diamond
// Community, Community & Strategic Alliances, Latino Business Map,
// Marketing Content, Social Media, Company Registration, Sales Tax Map, IRS
// Resources, Immigration Forms, National Notary State Guide, AI Team, AI
// Escalations, Professional Systems, Websites) live in nav-drawers.ts
// instead — still the same hrefs, just surfaced through ServicesDrawer /
// EcosystemDrawer rather than a 29th flat sidebar row.
export const navGroups: NavGroup[] = [
  {
    labelKey: "groupHome",
    items: [{ kind: "link", href: "/", labelKey: "dashboard", icon: LayoutDashboard }],
  },
  {
    labelKey: "groupBusiness",
    items: [
      { kind: "link", href: "/clients", labelKey: "clients", icon: Users },
      { kind: "link", href: "/companies", labelKey: "companies", icon: Building2 },
      { kind: "link", href: "/cases", labelKey: "cases", icon: Briefcase },
      { kind: "link", href: "/referrals", labelKey: "referrals", icon: Handshake },
    ],
  },
  {
    labelKey: "groupWorkspace",
    items: [
      // Same /appointments route and AppointmentCalendar component as
      // before — "calendar" only changes the sidebar's label (master
      // prompt section 9 / approval item 9).
      { kind: "link", href: "/appointments", labelKey: "calendar", icon: CalendarDays },
      { kind: "link", href: "/tasks", labelKey: "tasks", icon: ListChecks },
      { kind: "link", href: "/communications", labelKey: "communications", icon: MessagesSquare },
      // Not explicitly placed by the master prompt's own group list —
      // kept here since templates are message templates for the
      // Communications module right above it, not an orphaned route.
      { kind: "link", href: "/templates", labelKey: "templates", icon: NotepadText },
      { kind: "link", href: "/documents", labelKey: "documents", icon: FileText },
    ],
  },
  {
    labelKey: "groupFinance",
    items: [
      { kind: "link", href: "/invoices", labelKey: "invoices", icon: Receipt },
      { kind: "link", href: "/payments", labelKey: "payments", icon: Wallet },
    ],
  },
  {
    labelKey: "groupReporting",
    items: [{ kind: "link", href: "/reports", labelKey: "reports", icon: BarChart3 }],
  },
  {
    labelKey: "groupAdministration",
    items: [{ kind: "link", href: "/settings", labelKey: "settings", icon: Settings }],
  },
];

// Rendered between the FINANCE and REPORTING groups (master prompt section
// 3's literal order). Each opens the matching slide-out drawer defined in
// nav-drawers.ts instead of navigating directly.
export const navDrawerTriggers: NavDrawerTrigger[] = [
  { kind: "drawer", drawer: "services", labelKey: "services", icon: Layers },
  { kind: "drawer", drawer: "ecosystem", labelKey: "amsEcosystem", icon: Sparkles },
];
