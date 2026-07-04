import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "../src/lib/db";
import { users } from "../src/lib/db/schema";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    console.error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running this script.",
    );
    process.exit(1);
  }

  const db = getDb();
  const passwordHash = await bcrypt.hash(password, 12);
  const normalizedEmail = email.toLowerCase();

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ passwordHash, name })
      .where(eq(users.email, normalizedEmail));
    console.log(`Updated password for existing user ${normalizedEmail}.`);
  } else {
    await db.insert(users).values({ email: normalizedEmail, passwordHash, name });
    console.log(`Created admin user ${normalizedEmail}.`);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
