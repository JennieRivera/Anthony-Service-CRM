import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function listStaffAccounts() {
  return getDb().select().from(users).orderBy(asc(users.email));
}

export async function getStaffAccountByEmail(email: string) {
  const [row] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return row ?? null;
}
