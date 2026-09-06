"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/auth";
import {
  staffAccountFormSchema,
  type StaffAccountFormValues,
} from "@/lib/validation/staffAccount";
import { logAuditEvent } from "@/lib/audit";

// Defense in depth: src/proxy.ts already blocks non-admin/manager
// navigation to /settings, but a server action can be invoked directly,
// so every mutation here re-checks the session itself before touching
// who is allowed to sign in.
async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "admin" && role !== "manager") {
    throw new Error("Not authorized to manage staff accounts.");
  }
}

export async function createStaffAccountAction(rawValues: StaffAccountFormValues) {
  await requireAdmin();
  const values = staffAccountFormSchema.parse(rawValues);
  const email = values.email.toLowerCase();

  const [existing] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing) {
    throw new Error("A staff account with this email already exists.");
  }

  const [created] = await getDb()
    .insert(users)
    .values({
      email,
      name: values.name || null,
      role: values.role,
    })
    .returning({ id: users.id });

  await logAuditEvent({
    action: "staff_account.created",
    entityType: "staff_account",
    entityId: created.id,
    summary: `Added staff account "${email}" with role "${values.role}"`,
  });

  revalidatePath("/settings/staff-accounts");
}

export async function updateStaffAccountRoleAction(
  id: string,
  rawValues: StaffAccountFormValues,
) {
  await requireAdmin();
  const values = staffAccountFormSchema.parse(rawValues);

  await getDb()
    .update(users)
    .set({
      name: values.name || null,
      role: values.role,
    })
    .where(eq(users.id, id));

  await logAuditEvent({
    action: "staff_account.updated",
    entityType: "staff_account",
    entityId: id,
    summary: `Updated staff account role to "${values.role}"`,
  });

  revalidatePath("/settings/staff-accounts");
}

export async function deleteStaffAccountAction(id: string) {
  await requireAdmin();

  await getDb().delete(users).where(eq(users.id, id));

  await logAuditEvent({
    action: "staff_account.deleted",
    entityType: "staff_account",
    entityId: id,
    summary: "Removed a staff account — that email can no longer sign in",
  });

  revalidatePath("/settings/staff-accounts");
}
