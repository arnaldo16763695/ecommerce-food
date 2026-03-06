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

type CustomerOrderConfirmationInput = {
  orderNumber: number;
  customerName: string;
  customerEmail: string | null;
  fulfillmentType: "PICKUP" | "DELIVERY";
  totalCents: number;
  itemsCount: number;
};

export async function sendNewOrderInternalAlert(input: NewOrderAlertInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.ORDERS_ALERT_EMAIL;

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

  // Safe fallback for local/dev environments without email config.
  if (!apiKey || !from || !to) {
    console.log("[order-alert] email skipped (missing env vars):", {
      hasApiKey: Boolean(apiKey),
      from,
      to,
      orderNumber: input.orderNumber,
    });
    console.log("[order-alert] payload:\n" + text);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject,
    text,
  });
}

export async function sendOrderConfirmationToCustomer(
  input: CustomerOrderConfirmationInput,
) {
  if (!input.customerEmail) return;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

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

  // Safe fallback for local/dev environments without email config.
  if (!apiKey || !from) {
    console.log("[order-confirmation] email skipped (missing env vars):", {
      hasApiKey: Boolean(apiKey),
      from,
      to: input.customerEmail,
      orderNumber: input.orderNumber,
    });
    console.log("[order-confirmation] payload:\n" + text);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: input.customerEmail,
    subject,
    text,
  });
}
