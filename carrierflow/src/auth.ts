import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { authConfig } from "@/auth.config";
import { validateCredentialsWithMfa } from "@/lib/auth/mfa";
import { db } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  totp: z.string().optional(),
});

const googleEnabled =
  !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "Authenticator code", type: "text" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password, totp } = parsed.data;
        const result = await validateCredentialsWithMfa({
          email,
          password,
          totp,
        });
        if (result.status !== "ok") return null;

        const user = result.user;
        return {
          id: user.id,
          email: user.email,
          role: user.role,
        };
      },
    }),
    ...(googleEnabled
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
          }),
        ]
      : []),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ account, profile }) {
      if (account?.provider !== "google" || !profile?.email) {
        return true;
      }

      const email = profile.email.toLowerCase();
      await db.user.upsert({
        where: { email },
        create: {
          id: crypto.randomUUID(),
          email,
          role: "CARRIER",
          emailVerifiedAt: new Date(),
        },
        update: { emailVerifiedAt: new Date() },
      });
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (user?.id) {
        token.sub = user.id;
        token.role = user.role as UserRole;
        return token;
      }

      if (account?.provider === "google" && profile?.email) {
        const dbUser = await db.user.findUnique({
          where: { email: profile.email.toLowerCase() },
        });
        if (dbUser) {
          token.sub = dbUser.id;
          token.role = dbUser.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as UserRole) ?? "CARRIER";
      }
      return session;
    },
  },
});
