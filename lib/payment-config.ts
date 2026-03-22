import type { StoreSettings } from "@/lib/data/store-settings";
import { getStoreSettings } from "@/lib/data/store-settings";

export type CheckoutPaymentMethod = "MOBILE_PAYMENT" | "BANK_TRANSFER" | "IN_STORE";

type PaymentInstructions = {
  method: CheckoutPaymentMethod;
  label: string;
  shortDescription: string;
  details: Array<{ label: string; value: string }>;
  helperText: string;
};

export async function getCheckoutPaymentInstructions(
  existingStoreSettings?: StoreSettings,
): Promise<PaymentInstructions[]> {
  const storeSettings = existingStoreSettings ?? (await getStoreSettings());

  return [
    {
      method: "MOBILE_PAYMENT",
      label: "Pago movil",
      shortDescription: "Pago inmediato desde banca movil.",
      details: [
        {
          label: "Banco",
          value: storeSettings.paymentMobileBank,
        },
        {
          label: "Telefono",
          value: storeSettings.paymentMobilePhone,
        },
        {
          label: "Cedula/RIF",
          value: storeSettings.paymentMobileId,
        },
        {
          label: "Beneficiario",
          value: storeSettings.paymentBeneficiaryName,
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
          value: storeSettings.paymentTransferBank,
        },
        {
          label: "Tipo de cuenta",
          value: storeSettings.paymentTransferAccountType,
        },
        {
          label: "Numero de cuenta",
          value: storeSettings.paymentTransferAccountNumber,
        },
        {
          label: "Titular",
          value: storeSettings.paymentBeneficiaryName,
        },
        {
          label: "Cedula/RIF",
          value: storeSettings.paymentTransferId,
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
