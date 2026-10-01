// Phase 1 (AMS CRM V2 master prompt sections 4 & 6) — content for the two
// slide-out drawers. Every href below is an EXISTING route; nothing here
// creates a new page. Leaf links that point straight at an existing module
// reuse that module's own Nav.* label (passed as `navLabelKey`, read from
// the "Nav" translation namespace exactly like the main sidebar does) so
// the wording never drifts from the primary nav. Links with their own
// `labelKey` (the 10 service categories + "generic" case flows) get new
// copy that doesn't already exist anywhere, so those live under a new
// "Nav.servicesDrawer.*" namespace instead.

export type DrawerLink = {
  href: string;
  // Reuses an existing "Nav" key (e.g. "academy", "irsResources") so a
  // drawer link's text always matches that module's main sidebar label.
  navLabelKey?: string;
  // Used only for links that have no existing sidebar entry to borrow a
  // label from (the 10 service categories, and section headings).
  labelKey?: string;
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
      { href: "/cases/new?serviceType=company_registration", labelKey: "servicesBusinessFormation" },
      { href: "/cases/new", labelKey: "servicesTaxesBookkeeping" },
      { href: "/cases/new", labelKey: "servicesNotaryDocuments" },
      { href: "/cases/new?serviceType=immigration", labelKey: "servicesImmigration" },
      { href: "/cases/new?serviceType=leadership", labelKey: "servicesConsulting" },
      { href: "/cases/new?serviceType=credit_financing", labelKey: "servicesCreditFinancial" },
      { href: "/referrals/new", labelKey: "servicesCommercialFinance" },
      { href: "/cases/new?serviceType=marketing", labelKey: "servicesCrmTech" },
      { href: "/cases/new?serviceType=marketing", labelKey: "servicesMarketingBranding" },
      { href: "/cases/new", labelKey: "servicesCorporateEvents" },
    ],
  },
  {
    headingKey: "resourceLinksHeading",
    links: [
      { href: "/company-registration", navLabelKey: "companyRegistration" },
      { href: "/sales-tax-map", navLabelKey: "salesTaxMap" },
      { href: "/irs-resources", navLabelKey: "irsResources" },
      { href: "/immigration-forms", navLabelKey: "immigrationForms" },
      { href: "/notary-state-guide", navLabelKey: "notaryStateGuide" },
    ],
  },
];

export const ECOSYSTEM_DRAWER_SECTIONS: DrawerSection[] = [
  {
    links: [
      { href: "/academy", navLabelKey: "academy" },
      { href: "/diamond-community", navLabelKey: "diamondCommunity" },
      { href: "/community", navLabelKey: "community" },
      { href: "/latino-business-map", navLabelKey: "latinoBusinessMap" },
    ],
  },
  {
    headingKey: "marketingStudioHeading",
    links: [
      { href: "/marketing-content", navLabelKey: "marketingContent" },
      { href: "/social-media", navLabelKey: "socialMedia" },
    ],
  },
  {
    headingKey: "aiAutomationHeading",
    links: [
      { href: "/ai-team", navLabelKey: "aiTeam" },
      { href: "/ai-escalations", navLabelKey: "aiEscalations" },
    ],
  },
  {
    headingKey: "professionalResourceCenterHeading",
    links: [
      { href: "/notary-state-guide", navLabelKey: "notaryStateGuide" },
      { href: "/irs-resources", navLabelKey: "irsResources" },
      { href: "/immigration-forms", navLabelKey: "immigrationForms" },
      { href: "/sales-tax-map", navLabelKey: "salesTaxMap" },
    ],
  },
  {
    links: [
      { href: "/professional-systems", navLabelKey: "professionalSystems" },
      { href: "/websites", navLabelKey: "websites" },
    ],
  },
];
