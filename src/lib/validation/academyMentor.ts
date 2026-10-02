import { z } from "zod";

export const academyRoleStatusValues = ["active", "paused", "inactive"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

// Phase 2B — same identity rule as academyInstructor.ts: link an existing
// client when known, free-text name only as the fallback when not.
export const academyMentorFormSchema = z
  .object({
    clientId: optionalString,
    name: optionalString,
    email: optionalString,
    phone: optionalString,
    focusArea: optionalString,
    notes: optionalString,
    startDate: optionalString,
    status: z.enum(academyRoleStatusValues),
  })
  .refine((data) => Boolean(data.clientId) || Boolean(data.name?.trim()), {
    message: "Enter a name or link an existing client",
    path: ["name"],
  });

export type AcademyMentorFormValues = z.infer<typeof academyMentorFormSchema>;
