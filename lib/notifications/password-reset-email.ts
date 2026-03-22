import { Resend } from "resend";

function getBaseUrl() {
  if (process.env.AUTH_URL) return process.env.AUTH_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

function getSender() {
  return (
    process.env.RESEND_FROM_EMAIL ??
    process.env.EMAIL_FROM ??
    process.env.RESEND_FROM
  );
}

export function buildPasswordResetUrl(email: string, rawToken: string) {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/reset-password?email=${encodeURIComponent(email)}&token=${rawToken}`;
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getSender();

  if (!apiKey || !from) {
    console.log("[auth-reset-password] email skipped (missing env vars):", {
      hasApiKey: Boolean(apiKey),
      from,
      to: params.to,
    });
    console.log("[auth-reset-password] resetUrl:", params.resetUrl);
    return;
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: params.to,
    subject: "Recupera tu contrasena",
    text: [
      "Hola,",
      "",
      "Recibimos una solicitud para restablecer tu contrasena.",
      "Haz clic en el siguiente enlace para crear una nueva:",
      params.resetUrl,
      "",
      "Si no solicitaste este cambio, ignora este mensaje.",
    ].join("\n"),
  });

  if (result.error) {
    throw new Error(
      `Resend password reset failed: ${result.error.message ?? "unknown_error"}`,
    );
  }
}
