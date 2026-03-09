import { Resend } from "resend";

function getBaseUrl() {
  if (process.env.AUTH_URL) return process.env.AUTH_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function buildVerificationUrl(email: string, rawToken: string) {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/auth/verify-email?email=${encodeURIComponent(email)}&token=${rawToken}`;
}

export async function sendVerificationEmail(params: {
  to: string;
  verifyUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.log("[auth-verification] email skipped (missing env vars):", {
      hasApiKey: Boolean(apiKey),
      from,
      to: params.to,
    });
    console.log("[auth-verification] verifyUrl:", params.verifyUrl);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: params.to,
    subject: "Verifica tu correo",
    text: [
      "Hola,",
      "",
      "Haz clic en el siguiente enlace para verificar tu correo:",
      params.verifyUrl,
      "",
      "Si no solicitaste este registro, ignora este mensaje.",
    ].join("\n"),
  });
}
