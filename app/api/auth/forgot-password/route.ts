import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomBytes, createHash } from "crypto";
import {
  buildPasswordResetUrl,
  sendPasswordResetEmail,
} from "@/lib/notifications/password-reset-email";

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

    // Generic response to avoid account enumeration.
    const okResponse = NextResponse.json({ ok: true }, { status: 200 });
    if (!email) return okResponse;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true },
    });

    // Only users with credentials password can reset through this flow.
    if (!user?.passwordHash) return okResponse;

    const rawToken = randomBytes(32).toString("hex");
    const token = sha256(rawToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    const identifier = resetIdentifier(email);

    await prisma.verificationToken.deleteMany({ where: { identifier } });
    await prisma.verificationToken.create({
      data: { identifier, token, expires },
    });

    const resetUrl = buildPasswordResetUrl(email, rawToken);
    await sendPasswordResetEmail({ to: email, resetUrl });

    return okResponse;
  } catch (error) {
    console.error("[forgot-password] failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
