import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

function resetIdentifier(email: string) {
  return `pwd:${email}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const rawToken = String(body.token ?? "").trim();
    const password = String(body.password ?? "");

    if (!email || !rawToken || password.length < 8) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const identifier = resetIdentifier(email);
    const token = sha256(rawToken);

    const storedToken = await prisma.verificationToken.findFirst({
      where: {
        identifier,
        token,
      },
      select: { identifier: true, token: true, expires: true },
    });

    if (!storedToken || storedToken.expires.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Reset link is invalid or expired." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { email },
        data: { passwordHash },
      }),
      prisma.verificationToken.deleteMany({ where: { identifier } }),
    ]);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[reset-password] failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json(
      { error: "Unable to reset password." },
      { status: 500 },
    );
  }
}
