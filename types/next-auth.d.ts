import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CUSTOMER" | "ADMIN" | "PREPARER";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "CUSTOMER" | "ADMIN" | "PREPARER";
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "CUSTOMER" | "ADMIN" | "PREPARER";
    rememberMe?: boolean;
  }
}
