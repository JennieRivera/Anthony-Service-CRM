import { z } from "zod";
import { roleValues } from "@/lib/permissions";

// Internal AMS staff roles only — super_admin is reserved exclusively for
// the ADMIN_EMAIL owner identity (src/auth.ts, getCurrentRole) and is
// deliberately excluded here so no database row can ever be assigned it,
// even via a hand-crafted request that bypasses the Select dropdown. See
// Phase 2H-B report sections E and I.
export const assignableRoleValues = roleValues.filter(
  (role): role is Exclude<(typeof roleValues)[number], "super_admin"> => role !== "super_admin",
);

const assignableRole = z.enum(roleValues).refine(
  (role): role is (typeof assignableRoleValues)[number] => role !== "super_admin",
  { message: "super_admin cannot be assigned to an internal user record" },
);

export const authorizedUserFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: assignableRole,
});
export type AuthorizedUserFormValues = z.input<typeof authorizedUserFormSchema>;

export const updateAuthorizedUserRoleSchema = z.object({
  role: assignableRole,
});
export type UpdateAuthorizedUserRoleValues = z.input<typeof updateAuthorizedUserRoleSchema>;

export const updateAuthorizedUserActiveSchema = z.object({
  isActive: z.boolean(),
});
export type UpdateAuthorizedUserActiveValues = z.input<typeof updateAuthorizedUserActiveSchema>;
