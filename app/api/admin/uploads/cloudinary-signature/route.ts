import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCloudinaryConfig, signCloudinaryParams } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { cloudName, apiKey, apiSecret, uploadFolder } = getCloudinaryConfig();
    const body = await req.json().catch(() => null);
    const folderSuffix =
      typeof body?.folderSuffix === "string" ? body.folderSuffix.trim() : "";
    const folder = folderSuffix
      ? `${uploadFolder}/${folderSuffix.replace(/^\/+|\/+$/g, "")}`
      : uploadFolder;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsToSign = {
      folder,
      timestamp,
    };

    const signature = signCloudinaryParams(paramsToSign, apiSecret);

    return NextResponse.json({
      data: {
        cloudName,
        apiKey,
        timestamp,
        folder,
        signature,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cloudinary configuration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
