import type { serviceTypeValues } from "./client";

type ServiceType = (typeof serviceTypeValues)[number];

// The 12 top-level "drawers" of the Documents cabinet (Phase 1 of the
// document-reorganization plan). Nine map to one or more case service
// types; "clientes", "referidos", and "otros" are cross-cutting and don't
// come from a case at all.
export const drawerValues = [
  "notaria",
  "impuestos",
  "bookkeeping",
  "inmigracion",
  "credito",
  "consultoria",
  "formacion",
  "academia",
  "marketing",
  "seguros",
  "clientes",
  "referidos",
  "otros",
] as const;

export type Drawer = (typeof drawerValues)[number];

// Drawers backed by one or more case service types — a client shows up as
// a sub-folder here whenever they have a case of one of these types.
export const SERVICE_DRAWERS = [
  "notaria",
  "impuestos",
  "bookkeeping",
  "inmigracion",
  "credito",
  "consultoria",
  "formacion",
  "academia",
  "marketing",
  "seguros",
] as const satisfies readonly Drawer[];

export type ServiceDrawer = (typeof SERVICE_DRAWERS)[number];

// Several real service types collapse into one drawer (Apostille/Doc Prep
// into Notaría; Sales Tax and IRS Administrative into Impuestos) per the
// user's explicit decision — see the folder-cabinet proposal.
export const SERVICE_TYPE_TO_DRAWER: Record<ServiceType, ServiceDrawer> = {
  notary: "notaria",
  online_notary: "notaria",
  document_prep: "notaria",
  tax_prep: "impuestos",
  sales_tax: "impuestos",
  irs_administrative: "impuestos",
  bookkeeping: "bookkeeping",
  immigration: "inmigracion",
  credit_financing: "credito",
  leadership: "consultoria",
  company_registration: "formacion",
  academy: "academia",
  marketing: "marketing",
  insurance_compliance: "seguros",
};

export function drawerColor(drawer: Drawer): string {
  return DRAWER_COLORS[drawer];
}

const DRAWER_COLORS: Record<Drawer, string> = {
  notaria: "#2c5f8a",
  impuestos: "#2f6b4f",
  bookkeeping: "#b9861f",
  inmigracion: "#c1571f",
  credito: "#6b4e9e",
  consultoria: "#a65a42",
  formacion: "#55606e",
  academia: "#9c3f6b",
  marketing: "#3c6e8a",
  seguros: "#2e7d6b",
  clientes: "#4a7c59",
  referidos: "#96751a",
  otros: "#7a7266",
};
