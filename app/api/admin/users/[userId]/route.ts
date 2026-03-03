import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["CUSTOMER", "ADMIN"]),
});

type Params = {
  params: Promise<{ userId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null);
  const parsed = updateRoleSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (session.user.id === userId && parsed.data.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Cannot remove your own admin role" },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!existingUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: parsed.data.role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      image: true,
    },
  });

  return NextResponse.json({ data: updated });
}
