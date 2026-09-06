import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import { users } from "@/lib/db/schema";

const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();

// Multi-staff login — ADMIN_EMAIL is always role "admin" regardless of
// whether a `users` row exists for it (no migration/seeding step needed
// for the account that already worked before this shipped). Every other
// email must have a row in `users` (added via Settings → Staff Accounts,
// admin/manager only) to sign in at all; its `role` column decides what
// they can reach once in, enforced in src/proxy.ts and reflected in the
// sidebar (src/components/shell/nav-items.ts).
async function lookupStaffRole(email: string): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;
  const [row] = await getDb()
    .select({ role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row?.role ?? null;
}

async function isKnownStaffEmail(email: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;
  const [row] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return Boolean(row);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Phase 4, Session 7 — "session timeout readiness" (spec #19). Explicit
  // 12-hour idle-independent expiry instead of Auth.js's 30-day default,
  // given this CRM handles immigration/tax/financial records. Sessions
  // still refresh on activity within that window (Auth.js's default
  // behavior), so an actively-working admin isn't logged out mid-task.
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [Google],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (email === adminEmail) return true;
      return isKnownStaffEmail(email);
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const email = user.email?.toLowerCase();
        token.role = email === adminEmail ? "admin" : await lookupStaffRole(email ?? "");
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      if (session.user) {
        session.user.role = token.role ?? null;
      }
      return session;
    },
  },
});
