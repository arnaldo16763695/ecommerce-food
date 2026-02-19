import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createHash } from "crypto";

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const rawToken = url.searchParams.get("token") ?? "";

  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const redirectOk = new URL("/login?verified=1", baseUrl);
  const redirectFail = new URL("/login?verified=0", baseUrl);

  if (!email || !rawToken) return NextResponse.redirect(redirectFail);

  const token = sha256(rawToken);

  const record = await prisma.verificationToken.findFirst({
    where: { identifier: email, token },
  });

  if (!record) return NextResponse.redirect(redirectFail);
  if (record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    return NextResponse.redirect(redirectFail);
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.deleteMany({ where: { identifier: email } }),
  ]);

  return NextResponse.redirect(redirectOk);
}
