"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { requireAccessArea } from "@/lib/permissions";
import { logAuditEvent } from "@/lib/audit";
import {
  getAuthorizedUserById,
  createAuthorizedUser,
  updateAuthorizedUserRole,
  setAuthorizedUserActive,
} from "@/lib/queries/authorizedUsers";
import {
  authorizedUserFormSchema,
  updateAuthorizedUserRoleSchema,
  updateAuthorizedUserActiveSchema,
  type AuthorizedUserFormValues,
  type UpdateAuthorizedUserRoleValues,
  type UpdateAuthorizedUserActiveValues,
} from "@/lib/validation/authorizedUser";

function firstZodIssueMessage(err: unknown): string | null {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? null;
  return null;
}

// Phase 2H-B, section 9 — role/active management is only reachable by
// whoever passes "user_role_administration", which is now scoped to
// exactly super_admin and admin (see the pre-release carve-out in
// canAccessArea, src/lib/permissions.ts) — manager no longer inherits it
// merely by sharing "*" with those two roles. On top of that area check,
// every mutation below additionally refuses to let the caller act on
// their OWN user row, so no authenticated internal user —
// even one who already has role-management access — can promote
// themselves, change their own permissions, or reactivate themselves
// after being disabled. The owner (ADMIN_EMAIL) never has a row here at
// all, so this check never affects the owner.
async function assertNotActingOnSelf(targetId: string) {
  const session = await auth();
  const actorEmail = session?.user?.email?.toLowerCase();
  const target = await getAuthorizedUserById(targetId);
  if (!target) throw new Error("User not found");
  if (actorEmail && target.email === actorEmail) {
    throw new Error("You cannot change your own role or access status.");
  }
  return target;
}

export async function createAuthorizedUserAction(rawValues: AuthorizedUserFormValues) {
  await requireAccessArea("user_role_administration");

  let values: ReturnType<typeof authorizedUserFormSchema.parse>;
  try {
    values = authorizedUserFormSchema.parse(rawValues);
  } catch (err) {
    throw new Error(firstZodIssueMessage(err) ?? "Invalid user details");
  }

  const created = await createAuthorizedUser(values);

  await logAuditEvent({
    action: "user.authorized",
    entityType: "user",
    entityId: created.id,
    summary: `Authorized internal user "${created.email}" with role "${created.role}"`,
  });

  revalidatePath("/settings/users");
}

export async function updateAuthorizedUserRoleAction(
  id: string,
  rawValues: UpdateAuthorizedUserRoleValues,
) {
  await requireAccessArea("user_role_administration");
  const target = await assertNotActingOnSelf(id);

  let values: ReturnType<typeof updateAuthorizedUserRoleSchema.parse>;
  try {
    values = updateAuthorizedUserRoleSchema.parse(rawValues);
  } catch (err) {
    throw new Error(firstZodIssueMessage(err) ?? "Invalid role");
  }

  await updateAuthorizedUserRole(id, values.role);

  await logAuditEvent({
    action: "user.role_changed",
    entityType: "user",
    entityId: id,
    summary: `Changed role for "${target.email}" from "${target.role ?? "none"}" to "${values.role}"`,
  });

  revalidatePath("/settings/users");
}

export async function updateAuthorizedUserActiveAction(
  id: string,
  rawValues: UpdateAuthorizedUserActiveValues,
) {
  await requireAccessArea("user_role_administration");
  const target = await assertNotActingOnSelf(id);

  let values: ReturnType<typeof updateAuthorizedUserActiveSchema.parse>;
  try {
    values = updateAuthorizedUserActiveSchema.parse(rawValues);
  } catch (err) {
    throw new Error(firstZodIssueMessage(err) ?? "Invalid status");
  }

  await setAuthorizedUserActive(id, values.isActive);

  await logAuditEvent({
    action: values.isActive ? "user.activated" : "user.deactivated",
    entityType: "user",
    entityId: id,
    summary: `${values.isActive ? "Activated" : "Deactivated"} internal user "${target.email}"`,
  });

  revalidatePath("/settings/users");
}
