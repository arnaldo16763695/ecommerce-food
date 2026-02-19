import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { randomBytes, createHash } from "crypto";

function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Invalid email or password (min 8 chars)." },
        { status: 400 },
      );
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "User already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true },
    });

    //create token
    const rawToken = randomBytes(32).toString("hex");
    const token = sha256(rawToken);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // delete old tokens for that user
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    // 🔗 verification link (for now we log it)
    const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
    const verifyUrl =
      `${baseUrl}/api/auth/verify-email?` +
      `email=${encodeURIComponent(email)}&token=${rawToken}`;

    console.log("Verification link:", verifyUrl);

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
