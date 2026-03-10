import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { CredentialsSignin } from "next-auth";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EmailNotVerified";
}

class NotAdminError extends CredentialsSignin {
  code = "NotAdmin";
}

const LONG_SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days
const SHORT_SESSION_SECONDS = 60 * 60 * 24; // 1 day

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: LONG_SESSION_SECONDS },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.rememberMe =
          (user as { rememberMe?: boolean }).rememberMe !== false;
      }

      if (!token.id && token.sub) {
        token.id = token.sub;
      }

      if (!token.role && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: String(token.id) },
          select: { role: true },
        });
        token.role = dbUser?.role ?? "CUSTOMER";
      }

      const maxAge =
        token.rememberMe === false
          ? SHORT_SESSION_SECONDS
          : LONG_SESSION_SECONDS;
      token.exp = Math.floor(Date.now() / 1000) + maxAge;

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        if (token.role === "ADMIN") {
          session.user.role = "ADMIN";
        } else if (token.role === "PREPARER") {
          session.user.role = "PREPARER";
        } else {
          session.user.role = "CUSTOMER";
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        portal: { label: "Portal", type: "text" },
        rememberMe: { label: "Remember me", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        const portal = credentials?.portal;
        const rememberMe = credentials?.rememberMe;
        const rememberSession = rememberMe === "true";

        if (typeof email !== "string" || typeof password !== "string")
          return null;

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            role: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            emailVerified: true,
          },
        });

        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        
        if (!user.emailVerified) {
          throw new EmailNotVerifiedError();
        }

        if (
          portal === "admin" &&
          user.role !== "ADMIN" &&
          user.role !== "PREPARER"
        ) {
          throw new NotAdminError();
        }

        return {
          id: user.id,
          role: user.role,
          email: user.email,
          name: user.name,
          image: user.image,
          rememberMe: rememberSession,
        };
      },
    }),
  ],
});
