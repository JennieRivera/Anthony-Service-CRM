import { z } from "zod";

// Mirrors permissions.ts's roleValues minus "admin" — that's the fixed
// ADMIN_EMAIL account (src/auth.ts), never created here. "Manager" keeps
// the same full access as Admin, so it's offered as a staff role.
export const staffRoleValues = [
  "manager",
  "tax_staff",
  "bookkeeping_staff",
  "notary_staff",
  "consulting_staff",
  "academy_staff",
  "referral_manager",
  "community_manager",
  "immigration_staff",
] as const;

export const staffAccountFormSchema = z.object({
  email: z.string().trim().email("A valid email is required"),
  name: z.string().trim().optional().or(z.literal("")),
  role: z.enum(staffRoleValues),
});
export type StaffAccountFormValues = z.infer<typeof staffAccountFormSchema>;
