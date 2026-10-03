// Phase 1 (AMS CRM V2 master prompt sections 4 & 6) — content for the two
// slide-out drawers. Every href below is an EXISTING route; nothing here
// creates a new page. Leaf links that point straight at an existing module
// reuse that module's own Nav.* label (passed as `navLabelKey`, read from
// the "Nav" translation namespace exactly like the main sidebar does) so
// the wording never drifts from the primary nav. Links with their own
// `labelKey` (the 10 service categories + "generic" case flows) get new
// copy that doesn't already exist anywhere, so those live under a new
// "Nav.servicesDrawer.*" namespace instead.
//
// AMS Visual Experience phase — `icon` added to every leaf link (brief
// section 8: "tasteful professional icons... DO NOT add random stock
// images... DO NOT use emoji navigation"). Content/hrefs are otherwise
// byte-for-byte unchanged from before this phase.

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Calculator,
  Stamp,
  Globe,
  Target,
  LineChart,
  Landmark,
  Cpu,
  Megaphone,
  PartyPopper,
  Map,
  FileText,
  BookOpen,
  GraduationCap,
  Gem,
  Network,
  Image,
  Share2,
  Bot,
  AlertTriangle,
  Wrench,
  Globe2,
} from "lucide-react";

export type DrawerLink = {
  href: string;
  // Reuses an existing "Nav" key (e.g. "academy", "irsResources") so a
  // drawer link's text always matches that module's main sidebar label.
  navLabelKey?: string;
  // Used only for links that have no existing sidebar entry to borrow a
  // label from (the 10 service categories, and section headings).
  labelKey?: string;
  icon: LucideIcon;
};

export type DrawerSection = {
  // Omitted for the drawer's own un-headed top list (the 10 service
  // categories); present for "RESOURCE LINKS", "Marketing & Content
  // Studio", etc.
  headingKey?: string;
  links: DrawerLink[];
};

// Master prompt section 5's 10 service categories don't all map 1:1 to a
// single `cases.serviceType` value (e.g. "Taxes & Bookkeeping" spans the
// existing `tax_prep` AND `bookkeeping` enum values; "Corporate Events &
// Culinary Partnerships" has no case type at all yet). Rather than guess,
// categories with exactly one matching serviceType prefill the existing
// /cases/new?serviceType= flow (same param CaseForm already reads); every
// other category opens the plain /cases/new flow so staff pick the type
// themselves from the form's own list. "Commercial Finance Referrals" is a
// referrals category (referralCategoryValues), not a case, so it opens
// /referrals/new instead.
export const SERVICES_DRAWER_SECTIONS: DrawerSection[] = [
  {
    links: [
      { href: "/cases/new?serviceType=company_registration", labelKey: "servicesBusinessFormation", icon: Building2 },
      { href: "/cases/new", labelKey: "servicesTaxesBookkeeping", icon: Calculator },
      { href: "/cases/new", labelKey: "servicesNotaryDocuments", icon: Stamp },
      { href: "/cases/new?serviceType=immigration", labelKey: "servicesImmigration", icon: Globe },
      { href: "/cases/new?serviceType=leadership", labelKey: "servicesConsulting", icon: Target },
      { href: "/cases/new?serviceType=credit_financing", labelKey: "servicesCreditFinancial", icon: LineChart },
      { href: "/referrals/new", labelKey: "servicesCommercialFinance", icon: Landmark },
      { href: "/cases/new?serviceType=marketing", labelKey: "servicesCrmTech", icon: Cpu },
      { href: "/cases/new?serviceType=marketing", labelKey: "servicesMarketingBranding", icon: Megaphone },
      { href: "/cases/new", labelKey: "servicesCorporateEvents", icon: PartyPopper },
    ],
  },
  {
    headingKey: "resourceLinksHeading",
    links: [
      { href: "/company-registration", navLabelKey: "companyRegistration", icon: Building2 },
      { href: "/sales-tax-map", navLabelKey: "salesTaxMap", icon: Map },
      { href: "/irs-resources", navLabelKey: "irsResources", icon: FileText },
      { href: "/immigration-forms", navLabelKey: "immigrationForms", icon: FileText },
      { href: "/notary-state-guide", navLabelKey: "notaryStateGuide", icon: BookOpen },
    ],
  },
];

export const ECOSYSTEM_DRAWER_SECTIONS: DrawerSection[] = [
  {
    links: [
      { href: "/academy", navLabelKey: "academy", icon: GraduationCap },
      { href: "/diamond-community", navLabelKey: "diamondCommunity", icon: Gem },
      { href: "/community", navLabelKey: "community", icon: Network },
      { href: "/latino-business-map", navLabelKey: "latinoBusinessMap", icon: Map },
    ],
  },
  {
    headingKey: "marketingStudioHeading",
    links: [
      { href: "/marketing-content", navLabelKey: "marketingContent", icon: Image },
      { href: "/social-media", navLabelKey: "socialMedia", icon: Share2 },
    ],
  },
  {
    headingKey: "aiAutomationHeading",
    links: [
      { href: "/ai-team", navLabelKey: "aiTeam", icon: Bot },
      { href: "/ai-escalations", navLabelKey: "aiEscalations", icon: AlertTriangle },
    ],
  },
  {
    headingKey: "professionalResourceCenterHeading",
    links: [
      { href: "/notary-state-guide", navLabelKey: "notaryStateGuide", icon: BookOpen },
      { href: "/irs-resources", navLabelKey: "irsResources", icon: FileText },
      { href: "/immigration-forms", navLabelKey: "immigrationForms", icon: FileText },
      { href: "/sales-tax-map", navLabelKey: "salesTaxMap", icon: Map },
    ],
  },
  {
    links: [
      { href: "/professional-systems", navLabelKey: "professionalSystems", icon: Wrench },
      { href: "/websites", navLabelKey: "websites", icon: Globe2 },
    ],
  },
];
