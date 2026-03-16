import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const MAX_FILE_SIZE_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} env var.`);
  return value;
}

function sanitizeSegment(value: string) {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "");
}

function getFileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.trim().toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;

  const typeMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
  };

  return typeMap[file.type] ?? "bin";
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "images";

    const formData = await req.formData();
    const maybeFile = formData.get("file");
    const folderSuffix = String(formData.get("folderSuffix") ?? "checkout-proofs");

    if (!(maybeFile instanceof File)) {
      return NextResponse.json({ error: "Debes adjuntar un archivo." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(maybeFile.type)) {
      return NextResponse.json(
        { error: "Solo se permiten imagenes JPG, PNG, WEBP o archivos PDF." },
        { status: 400 },
      );
    }

    if (maybeFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "El comprobante excede el limite de 6 MB." },
        { status: 400 },
      );
    }

    const ext = getFileExtension(maybeFile);
    const safeFolder = sanitizeSegment(folderSuffix);
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
    const objectPath = safeFolder ? `${safeFolder}/${fileName}` : fileName;

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "x-upsert": "false",
        "Content-Type": maybeFile.type || "application/octet-stream",
      },
      body: Buffer.from(await maybeFile.arrayBuffer()),
    });

    if (!uploadRes.ok) {
      const uploadText = await uploadRes.text();
      return NextResponse.json(
        { error: `No se pudo subir el comprobante: ${uploadText}` },
        { status: 500 },
      );
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;

    return NextResponse.json({
      data: {
        path: objectPath,
        url: publicUrl,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Storage configuration error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
