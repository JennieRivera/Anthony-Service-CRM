import { canAccessArea, getCurrentRole } from "@/lib/permissions";

// For pages: whether to show the Export / Import buttons at all. The API
// routes and the import action enforce the same check themselves.
export async function dataAccess(): Promise<{ canExport: boolean; canImport: boolean }> {
  const role = await getCurrentRole();
  return {
    canExport: !!role && canAccessArea(role, "data_export"),
    canImport: !!role && canAccessArea(role, "data_import"),
  };
}
