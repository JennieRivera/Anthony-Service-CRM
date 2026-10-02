import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { AuthorizedUserFormValues } from "@/lib/validation/authorizedUser";

// Phase 2H-B — the internal AMS staff roster. The owner (ADMIN_EMAIL)
// deliberately never appears here (see src/lib/permissions.ts
// getCurrentRole) — this table is only ever "the other internal users."
export async function listAuthorizedUsers() {
  return getDb().select().from(users).orderBy(desc(users.createdAt));
}

export async function getAuthorizedUserById(id: string) {
  const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

// Email is always normalized to lowercase before this is called (the
// Zod schema does it), and again here as a defense-in-depth belt — this
// is the exact string compared against the authenticated Google
// account's email in both auth.ts (signIn) and permissions.ts
// (getCurrentRole), so a mismatch here would silently lock a real
// person out.
export async function createAuthorizedUser(values: AuthorizedUserFormValues) {
  const email = values.email.trim().toLowerCase();
  const [existing] = await getDb().select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    throw new Error("A user with this email already exists.");
  }

  const [row] = await getDb()
    .insert(users)
    .values({
      email,
      name: values.name.trim(),
      role: values.role,
      passwordHash: null,
      isActive: true,
    })
    .returning();
  return row;
}

export async function updateAuthorizedUserRole(id: string, role: string) {
  const [row] = await getDb()
    .update(users)
    .set({ role: role as (typeof users.$inferInsert)["role"], updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  if (!row) throw new Error("User not found");
  return row;
}

export async function setAuthorizedUserActive(id: string, isActive: boolean) {
  const [row] = await getDb()
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  if (!row) throw new Error("User not found");
  return row;
}
