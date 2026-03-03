import { createHash } from "crypto";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getCloudinaryConfig() {
  return {
    cloudName: getRequiredEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: getRequiredEnv("CLOUDINARY_API_KEY"),
    apiSecret: getRequiredEnv("CLOUDINARY_API_SECRET"),
    uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER ?? "e-commerce-food",
  };
}

export function signCloudinaryParams(params: Record<string, string>, apiSecret: string) {
  const toSign = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1")
    .update(`${toSign}${apiSecret}`)
    .digest("hex");
}
