import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isPublic =
        path.startsWith("/sign-in") ||
        path.startsWith("/sign-up") ||
        path.startsWith("/verify-email") ||
        path.startsWith("/api/auth") ||
        path.startsWith("/api/inngest") ||
        path === "/api/health";

      if (isPublic) return true;
      return !!auth?.user;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
