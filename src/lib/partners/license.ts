// Which license / insurance rules apply to an alliance in its profile:
// a general contractor confirms a current Florida license and insurance;
// for an installer the license is optional (some jobs don't need one).
export type LicenseMode = "contractor" | "installer" | "other";

export function licenseModeFor(organizationType: string | null | undefined): LicenseMode {
  if (organizationType === "contractor_remodeling") return "contractor";
  if (organizationType === "installer_remodeling") return "installer";
  return "other";
}
