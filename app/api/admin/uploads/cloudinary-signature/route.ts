import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCloudinaryConfig, signCloudinaryParams } from "@/lib/cloudinary";

export async function POST() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { cloudName, apiKey, apiSecret, uploadFolder } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign = {
      folder: uploadFolder,
      timestamp,
    };

    const signature = signCloudinaryParams(paramsToSign, apiSecret);

    return NextResponse.json({
      data: {
        cloudName,
        apiKey,
        timestamp,
        folder: uploadFolder,
        signature,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cloudinary configuration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
