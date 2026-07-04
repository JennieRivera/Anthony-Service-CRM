import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const allowedEmail = process.env.ADMIN_EMAIL?.toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
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
