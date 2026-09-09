import { z } from "zod";

export const diamondMemberTypeValues = ["student", "teacher"] as const;
export const diamondMemberStatusValues = ["active", "paused", "removed"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

// A student links to their existing client/case (no duplicated contact
// info); a teacher has no client or staff record, so needs a name.
export const diamondMemberFormSchema = z
  .object({
    memberType: z.enum(diamondMemberTypeValues),
    clientId: optionalString,
    caseId: optionalString,
    name: optionalString,
    phone: optionalString,
    email: optionalString,
    joinedDate: z.string().min(1, "Joined date is required"),
    notes: optionalString,
  })
  .refine(
    (data) => data.memberType !== "student" || Boolean(data.clientId),
    { message: "Select a student", path: ["clientId"] },
  )
  .refine(
    (data) => data.memberType !== "teacher" || Boolean(data.name?.trim()),
    { message: "Enter the teacher's name", path: ["name"] },
  );

export type DiamondMemberFormValues = z.infer<typeof diamondMemberFormSchema>;
