import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { getCloudinaryConfig, signCloudinaryParams } from "@/lib/cloudinary";

const destroySchema = z.object({
  publicId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = destroySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const signature = signCloudinaryParams(
      {
        public_id: parsed.data.publicId,
        timestamp,
      },
      apiSecret,
    );

    const form = new URLSearchParams({
      public_id: parsed.data.publicId,
      timestamp,
      api_key: apiKey,
      signature,
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Cloudinary destroy failed: ${text}` },
        { status: 502 },
      );
    }

    const result = (await response.json()) as { result?: string };
    return NextResponse.json({ data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cloudinary destroy error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
