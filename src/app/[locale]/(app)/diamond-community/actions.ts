"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { academyDiamondMembers } from "@/lib/db/schema";
import type { AcademyDiamondMember } from "@/lib/db/schema";
import {
  diamondMemberFormSchema,
  type DiamondMemberFormValues,
} from "@/lib/validation/academyDiamond";

export async function createDiamondMemberAction(
  rawValues: DiamondMemberFormValues,
) {
  const values = diamondMemberFormSchema.parse(rawValues);

  await getDb()
    .insert(academyDiamondMembers)
    .values({
      memberType: values.memberType,
      clientId: values.memberType === "student" ? values.clientId || null : null,
      caseId: values.memberType === "student" ? values.caseId || null : null,
      name: values.memberType === "teacher" ? values.name || null : null,
      phone: values.phone || null,
      email: values.email || null,
      joinedDate: values.joinedDate,
      notes: values.notes || null,
    });

  revalidatePath("/diamond-community");
}

// "Remove" is a status change, never a delete — same "preserve the
// record" posture as every other roster/pipeline in this CRM (alliances,
// associations, appointments).
export async function updateDiamondMemberStatusAction(
  id: string,
  status: AcademyDiamondMember["status"],
) {
  await getDb()
    .update(academyDiamondMembers)
    .set({ status, updatedAt: new Date() })
    .where(eq(academyDiamondMembers.id, id));

  revalidatePath("/diamond-community");
}

export async function updateDiamondMemberNotesAction(id: string, notes: string) {
  await getDb()
    .update(academyDiamondMembers)
    .set({ notes: notes.trim() || null, updatedAt: new Date() })
    .where(eq(academyDiamondMembers.id, id));

  revalidatePath("/diamond-community");
}
