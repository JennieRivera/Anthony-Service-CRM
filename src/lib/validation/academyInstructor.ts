import { z } from "zod";

export const academyRoleStatusValues = ["active", "paused", "inactive"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

// Phase 2B — same "link an existing client, or fall back to free text"
// rule as Diamond Community's non-student members (see
// src/lib/validation/academyDiamond.ts): clientId is optional, but name is
// required whenever no client is linked, so every row still displays a
// name with no join.
export const academyInstructorFormSchema = z
  .object({
    clientId: optionalString,
    name: optionalString,
    email: optionalString,
    phone: optionalString,
    title: optionalString,
    specialty: optionalString,
    bio: optionalString,
    startDate: optionalString,
    status: z.enum(academyRoleStatusValues),
  })
  .refine((data) => Boolean(data.clientId) || Boolean(data.name?.trim()), {
    message: "Enter a name or link an existing client",
    path: ["name"],
  });

export type AcademyInstructorFormValues = z.infer<typeof academyInstructorFormSchema>;
