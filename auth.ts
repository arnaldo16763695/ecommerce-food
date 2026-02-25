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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
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
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "CUSTOMER";
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
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        const portal = credentials?.portal;

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

        if (portal === "admin" && user.role !== "ADMIN") {
          throw new NotAdminError();
        }

        return {
          id: user.id,
          role: user.role,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
});
