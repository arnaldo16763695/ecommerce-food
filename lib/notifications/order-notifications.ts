import { Resend } from "resend";

type NewOrderAlertInput = {
  orderNumber: number;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  fulfillmentType: "PICKUP" | "DELIVERY";
  totalCents: number;
  itemsCount: number;
  createdAt: Date;
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ??
    process.env.EMAIL_FROM ??
    process.env.RESEND_FROM;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY env var.");
  }

  if (!from) {
    throw new Error(
      "Missing sender env var. Configure RESEND_FROM_EMAIL (or EMAIL_FROM / RESEND_FROM).",
    );
  }

  return { apiKey, from };
}

type CustomerOrderConfirmationInput = {
  orderNumber: number;
  customerName: string;
  customerEmail: string | null;
  fulfillmentType: "PICKUP" | "DELIVERY";
  totalCents: number;
  itemsCount: number;
};

type PaymentReviewCustomerInput = {
  orderNumber: number;
  customerName: string;
  customerEmail: string | null;
  reviewNote?: string | null;
};

export async function sendNewOrderInternalAlert(input: NewOrderAlertInput) {
  const { apiKey, from } = getResendConfig();
  const to = process.env.ORDERS_ALERT_EMAIL;

  if (!to) {
    throw new Error("Missing ORDERS_ALERT_EMAIL env var.");
  }

  const subject = `Nuevo pedido #${input.orderNumber}`;
  const lines = [
    `Pedido: #${input.orderNumber}`,
    `Fecha: ${input.createdAt.toISOString()}`,
    `Cliente: ${input.customerName}`,
    `Telefono: ${input.customerPhone ?? "-"}`,
    `Email: ${input.customerEmail ?? "-"}`,
    `Entrega: ${input.fulfillmentType === "DELIVERY" ? "Delivery" : "Retiro en tienda"}`,
    `Items: ${input.itemsCount}`,
    `Total: ${formatMoney(input.totalCents)}`,
  ];
  const text = lines.join("\n");

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to,
    subject,
    text,
  });

  if (result.error) {
    throw new Error(
      `Resend internal alert failed: ${result.error.message ?? "unknown_error"}`,
    );
  }
}

export async function sendOrderConfirmationToCustomer(
  input: CustomerOrderConfirmationInput,
) {
  if (!input.customerEmail) return;

  const { apiKey, from } = getResendConfig();

  const subject = `Confirmacion de pedido #${input.orderNumber}`;
  const text = [
    `Hola ${input.customerName},`,
    "",
    `Recibimos tu pedido #${input.orderNumber}.`,
    `Tipo de entrega: ${input.fulfillmentType === "DELIVERY" ? "Delivery" : "Retiro en tienda"}`,
    `Items: ${input.itemsCount}`,
    `Total: ${formatMoney(input.totalCents)}`,
    "",
    "Gracias por tu compra.",
  ].join("\n");

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: input.customerEmail,
    subject,
    text,
  });

  if (result.error) {
    throw new Error(
      `Resend customer confirmation failed: ${result.error.message ?? "unknown_error"}`,
    );
  }
}

export async function sendPaymentApprovedToCustomer(
  input: PaymentReviewCustomerInput,
) {
  if (!input.customerEmail) return;

  const { apiKey, from } = getResendConfig();

  const subject = `Pago aprobado para tu pedido #${input.orderNumber}`;
  const text = [
    `Hola ${input.customerName},`,
    "",
    `Confirmamos el pago de tu pedido #${input.orderNumber}.`,
    "Tu comprobante fue validado correctamente y tu pedido seguira su flujo normal.",
    "",
    "Gracias por tu compra.",
  ].join("\n");

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: input.customerEmail,
    subject,
    text,
  });

  if (result.error) {
    throw new Error(
      `Resend payment approved failed: ${result.error.message ?? "unknown_error"}`,
    );
  }
}

export async function sendPaymentRejectedToCustomer(
  input: PaymentReviewCustomerInput,
) {
  if (!input.customerEmail) return;

  const { apiKey, from } = getResendConfig();

  const subject = `Revisa el comprobante de tu pedido #${input.orderNumber}`;
  const text = [
    `Hola ${input.customerName},`,
    "",
    `No pudimos validar el comprobante de tu pedido #${input.orderNumber}.`,
    input.reviewNote
      ? `Motivo de revision: ${input.reviewNote}`
      : "Por favor revisa la informacion enviada y vuelve a compartir un comprobante valido.",
    "",
    "Si lo deseas, puedes contactar al negocio para completar el pago.",
  ].join("\n");

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: input.customerEmail,
    subject,
    text,
  });

  if (result.error) {
    throw new Error(
      `Resend payment rejected failed: ${result.error.message ?? "unknown_error"}`,
    );
  }
}
