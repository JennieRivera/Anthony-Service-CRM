import { z } from "zod";

// THE list of services — one source for the Services menu, a case's
// "Service type", /book, the portal, filters and reports, in the order the
// owner approved on 2026-10-06. Names live in messages → ServiceType (CRM)
// and PublicServiceType (/book, portal). The menu is built from this list
// in src/components/shell/nav-drawers.ts.
export const serviceTypeValues = [
  "company_registration",
  "tax_prep",
  "bookkeeping",
  "sales_tax",
  "irs_administrative",
  "notary",
  "document_prep",
  "immigration",
  "leadership",
  "credit_financing",
  "crm_technology",
  "marketing",
  "insurance_compliance",
  "academy",
  "corporate_events",
  "remodeling",
  // Legacy — folded into "notary". Kept for existing cases; never offered
  // for a new one (see LEGACY_SERVICE_TYPES).
  "online_notary",
] as const;

export type ServiceTypeValue = (typeof serviceTypeValues)[number];

export const LEGACY_SERVICE_TYPES: readonly ServiceTypeValue[] = ["online_notary"];

// What a NEW case, appointment, catalog item… can be: every service except
// the legacy ones.
export const activeServiceTypeValues = serviceTypeValues.filter(
  (s) => !LEGACY_SERVICE_TYPES.includes(s),
);

// Options for a service picker: the current services, plus the record's
// own value when it is a legacy one (so editing an old record still shows
// what it has).
export function serviceTypeOptions(current?: string | null): ServiceTypeValue[] {
  return serviceTypeValues.filter((s) => !LEGACY_SERVICE_TYPES.includes(s) || s === current);
}

export const clientStatusValues = [
  "lead",
  "active",
  "in_progress",
  "completed",
  "follow_up",
] as const;

export const clientFormSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  preferredLanguage: z.enum(["en", "es"]),
  status: z.enum(clientStatusValues),
  referralSource: z.string().trim().optional().or(z.literal("")),
  interestedServices: z.array(z.enum(serviceTypeValues)),
  notes: z.string().trim().optional().or(z.literal("")),
  companyId: z.string().trim().optional().or(z.literal("")),
  // Free-text document-cabinet folder label (e.g. "001"), edited by staff.
  folderNumber: z.string().trim().optional().or(z.literal("")),
  // Also editable by the client in the portal (Step 2B). Optional so a
  // caller that doesn't send them never wipes them (see normalize()).
  address: z.string().trim().max(300).optional().or(z.literal("")),
  bestTimeToCall: z.enum(["morning", "midday", "afternoon", "evening"]).optional().or(z.literal("")),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
