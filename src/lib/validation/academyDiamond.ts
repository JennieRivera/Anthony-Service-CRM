import { z } from "zod";

export const diamondMemberTypeValues = [
  "student",
  "teacher",
  "instructor",
  "mentor",
  "mentee",
] as const;
export const diamondMemberStatusValues = ["active", "paused", "removed"] as const;

const optionalString = z.string().trim().optional().or(z.literal(""));

// A student links to their existing client/case (no duplicated contact
// info). Every other member type (teacher/instructor/mentor/mentee) has
// no case to join, but may already be a known client — teacherClientId
// links to that existing clients row when so; otherwise name is the
// free-text fallback. Either one satisfies the "who is this" requirement.
export const diamondMemberFormSchema = z
  .object({
    memberType: z.enum(diamondMemberTypeValues),
    clientId: optionalString,
    caseId: optionalString,
    teacherClientId: optionalString,
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
    (data) =>
      data.memberType === "student" ||
      Boolean(data.name?.trim()) ||
      Boolean(data.teacherClientId),
    { message: "Enter a name or link an existing client", path: ["name"] },
  );

export type DiamondMemberFormValues = z.infer<typeof diamondMemberFormSchema>;
