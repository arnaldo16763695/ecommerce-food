import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { CredentialsSignin } from "next-auth";

import type { Prisma } from "@/app/generated/prisma";
import { createAuditLog } from "@/lib/audit";
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

async function logAuthEvent(input: {
  action: string;
  summary: string;
  request?: Request;
  actor?: { id?: string; role?: "CUSTOMER" | "ADMIN" | "PREPARER" | null } | null;
  entityLabel?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await createAuditLog({
    actor: input.actor,
    action: input.action,
    entityType: "AUTH",
    entityId: input.actor?.id ?? null,
    entityLabel: input.entityLabel ?? input.actor?.id ?? null,
    summary: input.summary,
    request: input.request,
    metadata: input.metadata,
  });
}

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
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;
        const portal = credentials?.portal;
        const rememberMe = credentials?.rememberMe;
        const rememberSession = rememberMe === "true";

        if (typeof email !== "string" || typeof password !== "string")
          return null;

        const normalizedEmail = email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
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

        if (!user?.passwordHash) {
          await logAuthEvent({
            action: "LOGIN_FAILED",
            summary: `Fallo el inicio de sesion para ${normalizedEmail}.`,
            request,
            entityLabel: normalizedEmail,
            metadata: {
              reason: "USER_NOT_FOUND_OR_PASSWORDLESS",
              portal: portal ?? "storefront",
            },
          });
          return null;
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await logAuthEvent({
            action: "LOGIN_FAILED",
            summary: `Fallo el inicio de sesion para ${user.email ?? normalizedEmail}.`,
            request,
            actor: { id: user.id, role: user.role },
            entityLabel: user.email ?? normalizedEmail,
            metadata: {
              reason: "INVALID_PASSWORD",
              portal: portal ?? "storefront",
            },
          });
          return null;
        }

        if (!user.emailVerified) {
          await logAuthEvent({
            action: "LOGIN_FAILED",
            summary: `Bloqueo de login por email no verificado para ${user.email ?? normalizedEmail}.`,
            request,
            actor: { id: user.id, role: user.role },
            entityLabel: user.email ?? normalizedEmail,
            metadata: {
              reason: "EMAIL_NOT_VERIFIED",
              portal: portal ?? "storefront",
            },
          });
          throw new EmailNotVerifiedError();
        }

        if (
          portal === "admin" &&
          user.role !== "ADMIN" &&
          user.role !== "PREPARER"
        ) {
          await logAuthEvent({
            action: "LOGIN_FAILED",
            summary: `Bloqueo de acceso administrativo para ${user.email ?? normalizedEmail}.`,
            request,
            actor: { id: user.id, role: user.role },
            entityLabel: user.email ?? normalizedEmail,
            metadata: {
              reason: "ROLE_NOT_ALLOWED_FOR_ADMIN_PORTAL",
              portal: "admin",
            },
          });
          throw new NotAdminError();
        }

        await logAuthEvent({
          action: "LOGIN_SUCCESS",
          summary: `Inicio de sesion exitoso para ${user.email ?? normalizedEmail}.`,
          request,
          actor: { id: user.id, role: user.role },
          entityLabel: user.email ?? normalizedEmail,
          metadata: {
            portal: portal ?? "storefront",
            rememberMe: rememberSession,
          },
        });

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
