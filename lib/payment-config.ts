export type CheckoutPaymentMethod = "MOBILE_PAYMENT" | "BANK_TRANSFER" | "IN_STORE";

type PaymentInstructions = {
  method: CheckoutPaymentMethod;
  label: string;
  shortDescription: string;
  details: Array<{ label: string; value: string }>;
  helperText: string;
};

function valueOrFallback(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

export function getCheckoutPaymentInstructions(): PaymentInstructions[] {
  return [
    {
      method: "MOBILE_PAYMENT",
      label: "Pago movil",
      shortDescription: "Pago inmediato desde banca movil.",
      details: [
        {
          label: "Banco",
          value: valueOrFallback(process.env.PAYMENT_MOBILE_BANK, "Por configurar"),
        },
        {
          label: "Telefono",
          value: valueOrFallback(process.env.PAYMENT_MOBILE_PHONE, "Por configurar"),
        },
        {
          label: "Cedula/RIF",
          value: valueOrFallback(process.env.PAYMENT_MOBILE_ID, "Por configurar"),
        },
        {
          label: "Beneficiario",
          value: valueOrFallback(process.env.PAYMENT_BENEFICIARY_NAME, "Por configurar"),
        },
      ],
      helperText:
        "Realiza el pago movil y luego adjunta el comprobante o la captura del movimiento.",
    },
    {
      method: "BANK_TRANSFER",
      label: "Transferencia bancaria",
      shortDescription: "Transferencia a la cuenta del negocio.",
      details: [
        {
          label: "Banco",
          value: valueOrFallback(process.env.PAYMENT_TRANSFER_BANK, "Por configurar"),
        },
        {
          label: "Tipo de cuenta",
          value: valueOrFallback(
            process.env.PAYMENT_TRANSFER_ACCOUNT_TYPE,
            "Por configurar",
          ),
        },
        {
          label: "Numero de cuenta",
          value: valueOrFallback(
            process.env.PAYMENT_TRANSFER_ACCOUNT_NUMBER,
            "Por configurar",
          ),
        },
        {
          label: "Titular",
          value: valueOrFallback(process.env.PAYMENT_BENEFICIARY_NAME, "Por configurar"),
        },
        {
          label: "Cedula/RIF",
          value: valueOrFallback(process.env.PAYMENT_TRANSFER_ID, "Por configurar"),
        },
      ],
      helperText:
        "Haz la transferencia y adjunta el comprobante para agilizar la validacion del pedido.",
    },
    {
      method: "IN_STORE",
      label: "Pagar en tienda fisica",
      shortDescription: "Pagas al retirar en efectivo u otro medio disponible.",
      details: [
        {
          label: "Modalidad",
          value: "Pago presencial al retirar el pedido",
        },
        {
          label: "Medios",
          value: "Efectivo, punto de venta u otro disponible en caja",
        },
      ],
      helperText:
        "Selecciona esta opcion si prefieres pagar presencialmente al retirar tu pedido en tienda.",
    },
  ];
}
