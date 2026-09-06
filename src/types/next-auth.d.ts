import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      // null for the ADMIN_EMAIL account before it's ever looked up (it's
      // always treated as "admin" in code, see src/auth.ts) or for a
      // staff row that hasn't been assigned a role yet.
      role: string | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: string | null;
  }
}
