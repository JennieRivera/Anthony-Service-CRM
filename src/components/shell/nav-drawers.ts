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
  BookMarked,
  Receipt,
  ShieldCheck,
  Hammer,
} from "lucide-react";
import { activeServiceTypeValues, type ServiceTypeValue } from "@/lib/validation/client";

export type DrawerLink = {
  href: string;
  // Reuses an existing "Nav" key (e.g. "academy", "irsResources") so a
  // drawer link's text always matches that module's main sidebar label.
  navLabelKey?: string;
  // Used only for links that have no existing sidebar entry to borrow a
  // label from (section headings, grouped entries).
  labelKey?: string;
  // A service: its label is that service's own name (messages →
  // ServiceType), so the menu and a case's "Service type" never drift.
  serviceType?: ServiceTypeValue;
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
const SERVICE_ICONS: Record<ServiceTypeValue, LucideIcon> = {
  company_registration: Building2,
  tax_prep: Calculator,
  bookkeeping: BookMarked,
  sales_tax: Receipt,
  irs_administrative: FileText,
  notary: Stamp,
  document_prep: FileText,
  immigration: Globe,
  leadership: Target,
  credit_financing: LineChart,
  crm_technology: Cpu,
  marketing: Megaphone,
  insurance_compliance: ShieldCheck,
  academy: GraduationCap,
  corporate_events: PartyPopper,
  remodeling: Hammer,
  online_notary: Stamp,
};

// The Services menu IS the service list (src/lib/validation/client.ts →
// serviceTypeValues, without the legacy ones), each opening a new case of
// that type — with two exceptions approved by the owner: Notary Public and
// Document Preparation share one entry that opens a two-button chooser,
// and Commercial Finance Referrals (a referral category, not a case type)
// sits right after Credit and opens /referrals/new.
function serviceMenuLinks(): DrawerLink[] {
  const links: DrawerLink[] = [];
  for (const service of activeServiceTypeValues) {
    if (service === "document_prep") continue;
    if (service === "notary") {
      links.push({ href: "/cases/new?choose=notary_documents", labelKey: "servicesNotaryDocuments", icon: Stamp });
      continue;
    }
    links.push({ href: `/cases/new?serviceType=${service}`, serviceType: service, icon: SERVICE_ICONS[service] });
    if (service === "credit_financing") {
      links.push({ href: "/referrals/new?category=commercial_finance", labelKey: "servicesCommercialFinance", icon: Landmark });
    }
  }
  return links;
}

export const SERVICES_DRAWER_SECTIONS: DrawerSection[] = [
  {
    links: serviceMenuLinks(),
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
