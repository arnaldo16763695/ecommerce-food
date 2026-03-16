import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { randomBytes, createHash } from "crypto";
import {
  buildVerificationUrl,
  sendVerificationEmail,
} from "@/lib/notifications/verification-email";

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();

    // Generic response to avoid leaking whether an account exists.
    const okResponse = NextResponse.json({ ok: true }, { status: 200 });

    if (!email) return okResponse;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, emailVerified: true },
    });

    // If user does not exist or is already verified, keep generic response.
    if (!user || user.emailVerified) return okResponse;

    const rawToken = randomBytes(32).toString("hex");
    const token = sha256(rawToken);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const verifyUrl = buildVerificationUrl(email, rawToken);
    await sendVerificationEmail({ to: email, verifyUrl });

    await createAuditLog({
      actor: { id: user.id, role: user.role },
      action: "EMAIL_VERIFICATION_SENT",
      entityType: "USER",
      entityId: user.id,
      entityLabel: email,
      summary: `Se reenvio la verificacion de email para ${email}.`,
      request: req,
      metadata: {
        email,
      },
    });

    return okResponse;
  } catch {
    // Keep generic response in case of failure.
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
