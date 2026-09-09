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
  Megaphone,
  Bot,
  ShieldAlert,
  LayoutGrid,
  Globe,
  GraduationCap,
  Gem,
  Share2,
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
    | "community"
    | "communications"
    | "templates"
    | "reports"
    | "companyRegistration"
    | "salesTaxMap"
    | "irsResources"
    | "immigrationForms"
    | "latinoBusinessMap"
    | "marketingContent"
    | "aiTeam"
    | "aiEscalations"
    | "professionalSystems"
    | "websites"
    | "academy"
    | "diamondCommunity"
    | "socialMedia"
    | "settings";
  icon: LucideIcon;
  // Forces the icon to full-opacity sidebar-foreground instead of the
  // usual dimmed /70 resting state — used for Diamond Community so it
  // reads as a deliberately-VIP highlight, not just another nav row.
  highlightIcon?: boolean;
};

// SIDEBAR-PLAN.md section 8 — order follows the plan's list wherever an
// item maps 1:1 to something that exists today. Items the plan lists but
// that don't exist yet as their own module (Services, Finance, Social
// Media, Calendar as distinct from Appointments, Academy, a separate
// Media Library, "Government & Compliance"/"Business Intelligence" as
// umbrella groupings) are deliberately left alone — that's new-module or
// grouping-decision work for a later session, not a menu reorder.
export const navItems: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/clients", labelKey: "clients", icon: Users },
  { href: "/companies", labelKey: "companies", icon: Building2 },
  { href: "/cases", labelKey: "cases", icon: Briefcase },
  { href: "/referrals", labelKey: "referrals", icon: Handshake },
  { href: "/payments", labelKey: "payments", icon: Wallet },
  { href: "/invoices", labelKey: "invoices", icon: Receipt },
  { href: "/communications", labelKey: "communications", icon: MessagesSquare },
  { href: "/templates", labelKey: "templates", icon: NotepadText },
  // SIDEBAR-PLAN.md section 3 — one sidebar item over the two existing,
  // deliberately-separate strategicAlliances/associationsChambers tables
  // (see the comment on /community/page.tsx and on associationsChambers
  // in schema.ts). Not a data merge, just a shared tabbed page.
  { href: "/community", labelKey: "community", icon: Network },
  { href: "/tasks", labelKey: "tasks", icon: ListChecks },
  { href: "/appointments", labelKey: "appointments", icon: CalendarDays },
  { href: "/documents", labelKey: "documents", icon: FileText },
  // Academy's own module — was previously reachable only through the
  // Dashboard's Academy "View All", which used to send staff to the
  // unfiltered /cases list mixed with every other service.
  { href: "/academy", labelKey: "academy", icon: GraduationCap },
  // VIP WhatsApp membership roster (admin + students + teachers),
  // deliberately distinct from /community (the Alliances/Associations
  // module) and from /communications. Icon stays at full brightness
  // rather than the usual dimmed resting state, per the user's request.
  {
    href: "/diamond-community",
    labelKey: "diamondCommunity",
    icon: Gem,
    highlightIcon: true,
  },
  // "Media Library" per SIDEBAR-PLAN.md section 9 — same route/table as
  // before (marketing_content_assets), just relabeled to match the plan's
  // terminology now that Social Media exists as its own, separate module.
  { href: "/marketing-content", labelKey: "marketingContent", icon: Megaphone },
  // Content planning/scheduling/publishing-prep, separate from the Media
  // Library (raw file storage) it references.
  { href: "/social-media", labelKey: "socialMedia", icon: Share2 },
  { href: "/company-registration", labelKey: "companyRegistration", icon: Map },
  { href: "/sales-tax-map", labelKey: "salesTaxMap", icon: Landmark },
  { href: "/irs-resources", labelKey: "irsResources", icon: Library },
  { href: "/immigration-forms", labelKey: "immigrationForms", icon: FileStack },
  { href: "/latino-business-map", labelKey: "latinoBusinessMap", icon: MapPinned },
  { href: "/ai-team", labelKey: "aiTeam", icon: Bot },
  { href: "/ai-escalations", labelKey: "aiEscalations", icon: ShieldAlert },
  // Promoted from Settings sub-pages per section 8's final sidebar order.
  { href: "/professional-systems", labelKey: "professionalSystems", icon: LayoutGrid },
  { href: "/websites", labelKey: "websites", icon: Globe },
  { href: "/reports", labelKey: "reports", icon: BarChart3 },
  { href: "/settings", labelKey: "settings", icon: Settings },
];
