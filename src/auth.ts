import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

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
    signIn({ user }) {
      return Boolean(allowedEmail) && user.email?.toLowerCase() === allowedEmail;
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
