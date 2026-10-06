import { activeServiceTypeValues, type ServiceTypeValue } from "./client";

// The Documents archive. Folders = the single services list
// (src/lib/validation/client.ts — same names and order as the Services
// menu) plus four general folders. Service folders are keyed by the
// service type itself, so they can never drift from the list again.
export type ServiceFolder = Exclude<ServiceTypeValue, "online_notary">;
export const SERVICE_FOLDERS = activeServiceTypeValues as readonly ServiceFolder[];

export const GENERAL_FOLDERS = ["clientes", "alianzas", "referidos", "otros"] as const;
export type GeneralFolder = (typeof GENERAL_FOLDERS)[number];

export type Drawer = ServiceFolder | GeneralFolder;
export const drawerValues: readonly Drawer[] = [...SERVICE_FOLDERS, ...GENERAL_FOLDERS];

export const isServiceFolder = (d: string): d is ServiceFolder => (SERVICE_FOLDERS as readonly string[]).includes(d);

// The legacy "Online Notary" type files under Notary Public.
export function serviceFolderFor(service: ServiceTypeValue): ServiceFolder {
  return service === "online_notary" ? "notary" : service;
}

// Where a document lives — exactly one folder, decided by where it was
// uploaded (owner's rule, 2026-10-06):
//   referral → Referrals; an explicit folder (chosen on the client record,
//   set from the case, or "Move to…") → that service; an Immigration
//   sub-folder → Immigration; a case (older rows) → the case's service;
//   tagged "Other" → Other; anything else → Clients.
// Alliance documents are a separate table and always live in Alliances.
export function documentFolder(doc: {
  referralId: string | null;
  serviceType: ServiceTypeValue | null;
  caseServiceType: ServiceTypeValue | null;
  folder: string | null;
  category: string | null;
}): Drawer {
  if (doc.referralId) return "referidos";
  if (doc.serviceType) return serviceFolderFor(doc.serviceType);
  if (doc.folder) return "immigration";
  if (doc.caseServiceType) return serviceFolderFor(doc.caseServiceType);
  if (doc.category === "other") return "otros";
  return "clientes";
}

// Default "Service / folder" when uploading on a client record: the
// service of their only open case; otherwise their first service of
// interest; otherwise the general Clients folder (null).
export function defaultClientUploadFolder(
  openCaseServices: ServiceTypeValue[],
  interestedServices: readonly string[] | null | undefined,
): ServiceFolder | null {
  const open = [...new Set(openCaseServices.map(serviceFolderFor))];
  if (open.length === 1) return open[0];
  const interested = (interestedServices ?? []).find((s) => (activeServiceTypeValues as readonly string[]).includes(s));
  return interested ? (interested as ServiceFolder) : null;
}

const GENERAL_COLORS: Record<GeneralFolder, string> = {
  clientes: "#4a7c59",
  alianzas: "#3f5aa8",
  referidos: "#96751a",
  otros: "#7a7266",
};

// Service folders use the service's own color (Settings → Service colors);
// general folders have fixed colors.
export function drawerColor(drawer: Drawer, serviceColors: Record<string, string> = {}): string {
  if (isServiceFolder(drawer)) return serviceColors[drawer] ?? "#55606e";
  return GENERAL_COLORS[drawer];
}
