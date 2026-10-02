import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import { users } from "@/lib/db/schema";

const allowedEmail = process.env.ADMIN_EMAIL?.toLowerCase();

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
    // Phase 2H-B — the owner check runs first and never touches the
    // database, so the owner can never be locked out by a missing table,
    // a failed migration, a down database, or a misconfigured staff row.
    // A second Google account is only let in when an active row for its
    // exact (lowercased) email already exists in `users` — no name
    // matching, no open signup, fail CLOSED (deny) if the lookup throws
    // or the database isn't configured. See Phase 2H-B report section F.
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (allowedEmail && email === allowedEmail) return true;

      if (!isDatabaseConfigured()) return false;
      try {
        const [record] = await getDb()
          .select({ isActive: users.isActive })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        return Boolean(record?.isActive);
      } catch {
        return false;
      }
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
