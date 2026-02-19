import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { randomBytes, createHash } from "crypto";

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();

    // Respuesta genérica (no revela si existe o no)
    const okResponse = NextResponse.json({ ok: true }, { status: 200 });

    if (!email) return okResponse;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true },
    });

    // Si no existe o ya está verificado, igual respondemos ok (sin revelar nada)
    if (!user || user.emailVerified) return okResponse;

    // Crear token nuevo (hasheado en DB)
    const rawToken = randomBytes(32).toString("hex");
    const token = sha256(rawToken);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    // En dev lo mostramos por consola (después lo enviamos por email real)
    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const verifyUrl =
      `${baseUrl}/api/auth/verify-email?` +
      `email=${encodeURIComponent(email)}&token=${rawToken}`;

    console.log("✅ Resend verify email:", verifyUrl);

    return okResponse;
  } catch {
    // Igual genérico
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
