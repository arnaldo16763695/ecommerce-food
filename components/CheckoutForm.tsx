"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AllProducts } from "@/lib/data/productsData";
import type { CheckoutPaymentMethod } from "@/lib/payment-config";
import { resolveProductImageSrc } from "@/lib/product-image";
import { uploadCheckoutProofToStorage } from "@/lib/uploads/client-upload";
import {
  convertUsdCentsToVesCents,
  formatCurrencyFromCents,
} from "@/lib/money";
import { useCartStore } from "@/store/cartStore";

type PaymentInstruction = {
  method: CheckoutPaymentMethod;
  label: string;
  shortDescription: string;
  details: Array<{ label: string; value: string }>;
  helperText: string;
};

type Props = {
  products: AllProducts[];
  usdToVesRate: number | null;
  deliveryFeeCents: number;
  freeDeliveryMinCents: number;
  isStoreOpen: boolean;
  storeStatusMessage: string;
  paymentInstructions: PaymentInstruction[];
};

type CheckoutStep = "DETAILS" | "PAYMENT";

export default function CheckoutForm({
  products,
  usdToVesRate,
  deliveryFeeCents,
  freeDeliveryMinCents,
  isStoreOpen,
  storeStatusMessage,
  paymentInstructions,
}: Props) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const hydrateFromServer = useCartStore((state) => state.hydrateFromServer);
  const isHydratedFromServer = useCartStore((state) => state.isHydratedFromServer);

  const [step, setStep] = useState<CheckoutStep>("DETAILS");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [orderNotes, setOrderNotes] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [addressNotes, setAddressNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [paymentProofPath, setPaymentProofPath] = useState("");
  const [paymentProofName, setPaymentProofName] = useState("");
  const [uploadingProof, setUploadingProof] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  useEffect(() => {
    if (!isHydratedFromServer) {
      void hydrateFromServer();
    }
  }, [hydrateFromServer, isHydratedFromServer]);

  const displayItems = useMemo(() => {
    return items
      .map((item) => {
        const productId = item.productId ?? item.id;
        const product = products.find((productEntry) => productEntry.id === productId);
        if (!product) return null;

        return {
          lineKey: item.id,
          name: product.name,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents ?? product.basePriceCents,
          image: resolveProductImageSrc(product.images[0]?.url),
          options: item.options ?? [],
        };
      })
      .filter(
        (
          item,
        ): item is {
          lineKey: string;
          name: string;
          quantity: number;
          unitPriceCents: number;
          image: string;
          options: NonNullable<(typeof items)[number]["options"]>;
        } => item !== null,
      );
  }, [items, products]);

  const subtotalCents = useMemo(() => {
    return displayItems.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0,
    );
  }, [displayItems]);

  const taxCents = Math.round(subtotalCents * 0.1);
  const deliveryFeeToApply =
    fulfillmentType === "DELIVERY"
      ? subtotalCents >= freeDeliveryMinCents
        ? 0
        : deliveryFeeCents
      : 0;
  const totalCents = subtotalCents + taxCents + deliveryFeeToApply;

  const selectedInstruction =
    paymentInstructions.find((instruction) => instruction.method === paymentMethod) ??
    null;
  const requiresPaymentSupport =
    paymentMethod === "MOBILE_PAYMENT" || paymentMethod === "BANK_TRANSFER";
  const showsPaymentSupport = paymentMethod !== null && paymentMethod !== "IN_STORE";

  const formatUsd = (cents: number) =>
    formatCurrencyFromCents(cents, "USD", "en-US");
  const formatVes = (cents: number) =>
    usdToVesRate
      ? formatCurrencyFromCents(
          convertUsdCentsToVesCents(cents, usdToVesRate),
          "VES",
          "es-VE",
        )
      : null;

  function validateDetailsStep() {
    if (!isStoreOpen) {
      return storeStatusMessage;
    }

    if (customerName.trim().length < 2) {
      return "Indica el nombre de quien recibe el pedido.";
    }

    if (!customerPhone.trim() && !customerEmail.trim()) {
      return "Debes indicar telefono o email para contactarte.";
    }

    if (fulfillmentType === "DELIVERY" && address1.trim().length < 3) {
      return "Debes indicar una direccion valida para delivery.";
    }

    return null;
  }

  function validatePaymentStep() {
    if (!isStoreOpen) {
      return storeStatusMessage;
    }

    if (!paymentMethod) {
      return "Debes seleccionar un metodo de pago para continuar.";
    }

    if (requiresPaymentSupport && !paymentReference.trim() && !paymentProofUrl) {
      return "Para este metodo de pago debes adjuntar el comprobante o indicar el numero de referencia.";
    }

    return null;
  }

  useEffect(() => {
    if (paymentMethod === "IN_STORE") {
      setPaymentReference("");
      setPaymentProofUrl("");
      setPaymentProofPath("");
      setPaymentProofName("");
    }
  }, [paymentMethod]);

  async function handleProofUpload(file: File) {
    setUploadingProof(true);
    setError(null);

    try {
      const uploaded = await uploadCheckoutProofToStorage({ file });
      setPaymentProofUrl(uploaded.url);
      setPaymentProofPath(uploaded.path);
      setPaymentProofName(file.name);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir el comprobante.",
      );
    } finally {
      setUploadingProof(false);
    }
  }

  function handleGoToPaymentStep() {
    const validationMessage = validateDetailsStep();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError(null);
    setStep("PAYMENT");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const validationMessage = validateDetailsStep();
      if (validationMessage) {
        throw new Error(validationMessage);
      }
      const paymentValidationMessage = validatePaymentStep();
      if (paymentValidationMessage) {
        throw new Error(paymentValidationMessage);
      }

      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        fulfillmentType,
        notes: orderNotes.trim() || undefined,
        paymentMethod,
        paymentReference:
          paymentMethod !== "IN_STORE" ? paymentReference.trim() || undefined : undefined,
        paymentProofUrl:
          paymentMethod !== "IN_STORE" ? paymentProofUrl || undefined : undefined,
        paymentProofPath:
          paymentMethod !== "IN_STORE" ? paymentProofPath || undefined : undefined,
        deliveryAddress:
          fulfillmentType === "DELIVERY"
            ? {
                address1: address1.trim(),
                address2: address2.trim() || undefined,
                city: city.trim() || undefined,
                notes: addressNotes.trim() || undefined,
              }
            : undefined,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo finalizar la compra.");
      }

      const body = (await res.json()) as {
        data: { orderNumber: number };
      };

      clearCart();
      router.push(`/checkout/success?order=${body.data.orderNumber}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Error inesperado al finalizar compra.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!isHydratedFromServer) {
    return <p className="text-sm text-slate-600">Cargando checkout...</p>;
  }

  if (displayItems.length === 0) {
    return (
      <div className="space-y-3 rounded-lg border p-5">
        <p className="text-sm text-slate-600">Tu carrito esta vacio.</p>
        <Link href="/shop" className="btn-primary inline-flex">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-3 lg:gap-6">
      <section className="space-y-3 pb-28 lg:col-span-2 lg:space-y-4 lg:pb-0">
        {!isStoreOpen ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="text-sm font-semibold">La tienda esta cerrada en este momento.</p>
            <p className="mt-1 text-sm">{storeStatusMessage}</p>
          </div>
        ) : null}

        <div className="rounded-lg border p-3 lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobileSummary((current) => !current)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Resumen del pedido
              </p>
              <p className="text-xs text-slate-500">
                {displayItems.length} items - {formatUsd(totalCents)}
              </p>
            </div>
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {showMobileSummary ? "Ocultar" : "Ver"}
            </span>
          </button>

          {showMobileSummary ? (
            <div className="mt-3 space-y-3 border-t pt-3">
              {displayItems.map((item) => (
                <div key={item.lineKey} className="flex gap-3 rounded-md border p-2">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={44}
                    height={44}
                    className="rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.quantity} x {formatUsd(item.unitPriceCents)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap gap-3">
            <div
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                step === "DETAILS"
                  ? "bg-primary-600 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              1. Datos del pedido
            </div>
            <div
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                step === "PAYMENT"
                  ? "bg-primary-600 text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              2. Metodo de pago
            </div>
          </div>
        </div>

        {step === "DETAILS" ? (
          <>
            <div className="rounded-lg border p-4">
              <h2 className="mb-3 text-lg font-semibold">Datos del cliente</h2>
              <p className="mb-3 text-xs text-slate-500">
                Completa al menos un medio de contacto: telefono o email.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-medium">Nombre</label>
                  <Input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Telefono</label>
                  <Input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg border p-4">
              <h2 className="mb-3 text-lg font-semibold">Entrega</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <input
                    type="radio"
                    checked={fulfillmentType === "PICKUP"}
                    onChange={() => setFulfillmentType("PICKUP")}
                  />
                  Retiro en tienda
                </label>
                <label className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <input
                    type="radio"
                    checked={fulfillmentType === "DELIVERY"}
                    onChange={() => setFulfillmentType("DELIVERY")}
                  />
                  Delivery
                </label>
              </div>

              {fulfillmentType === "DELIVERY" ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium">Direccion</label>
                    <Input
                      value={address1}
                      onChange={(event) => setAddress1(event.target.value)}
                      required={fulfillmentType === "DELIVERY"}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Apto/Piso (opcional)
                    </label>
                    <Input
                      value={address2}
                      onChange={(event) => setAddress2(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Ciudad (opcional)</label>
                    <Input value={city} onChange={(event) => setCity(event.target.value)} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-medium">Notas de direccion</label>
                    <textarea
                      value={addressNotes}
                      onChange={(event) => setAddressNotes(event.target.value)}
                      rows={3}
                      className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border p-4">
              <label className="mb-1 block text-sm font-medium">Notas del pedido</label>
              <textarea
                value={orderNotes}
                onChange={(event) => setOrderNotes(event.target.value)}
                rows={3}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="hidden justify-end lg:flex">
              <Button type="button" onClick={handleGoToPaymentStep} disabled={!isStoreOpen}>
                Siguiente
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border p-4">
              <h2 className="mb-3 text-lg font-semibold">Elige tu metodo de pago</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {paymentInstructions.map((instruction) => (
                  <label
                    key={instruction.method}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      paymentMethod === instruction.method
                        ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-950/30"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment-method"
                      className="sr-only"
                      checked={paymentMethod === instruction.method}
                      onChange={() => setPaymentMethod(instruction.method)}
                    />
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {instruction.label}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {instruction.shortDescription}
                    </p>
                  </label>
                ))}
              </div>
              {!paymentMethod ? (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                  Selecciona un metodo de pago para ver las instrucciones.
                </p>
              ) : null}
            </div>

            {selectedInstruction ? (
              <div className="rounded-lg border p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedInstruction.label}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {selectedInstruction.helperText}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {selectedInstruction.details.map((detail) => (
                    <div
                      key={`${selectedInstruction.method}-${detail.label}`}
                      className="rounded-lg border border-dashed p-3"
                    >
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        {detail.label}
                      </p>
                      <p className="mt-1 font-medium text-slate-900 dark:text-slate-100">
                        {detail.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {showsPaymentSupport ? (
              <div className="rounded-lg border p-4">
                <h3 className="mb-3 text-lg font-semibold">Soporte del pago</h3>
                <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
                  {requiresPaymentSupport
                    ? "Debes adjuntar el comprobante o indicar el numero de referencia para continuar."
                    : "Puedes adjuntar un comprobante o indicar una referencia para agilizar la validacion."}
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      {requiresPaymentSupport
                        ? "Numero de referencia"
                        : "Referencia (opcional)"}
                    </label>
                    <Input
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder="Ej: 845221"
                      maxLength={120}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Adjuntar comprobante
                    </label>
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,application/pdf"
                      disabled={uploadingProof}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void handleProofUpload(file);
                      }}
                    />
                    <p className="text-xs text-slate-500">
                      Acepta JPG, PNG, WEBP o PDF hasta 6 MB.
                    </p>
                  </div>
                </div>

                {uploadingProof ? (
                  <p className="mt-3 text-sm text-slate-600">Subiendo comprobante...</p>
                ) : null}
                {paymentProofName ? (
                  <p className="mt-3 text-sm text-green-700 dark:text-green-400">
                    Comprobante cargado: {paymentProofName}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="hidden flex-wrap justify-between gap-3 lg:flex">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("DETAILS")}
              >
                Volver
              </Button>
              <Button type="submit" disabled={submitting || uploadingProof || !isStoreOpen}>
                {submitting ? "Procesando..." : "Finalizar compra"}
              </Button>
            </div>
          </>
        )}
      </section>

      <aside className="hidden space-y-4 lg:block">
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-lg font-semibold">Resumen</h3>
          <div className="space-y-3">
            {displayItems.map((item) => (
              <div key={item.lineKey} className="flex gap-3 rounded-md border p-2">
                <Image
                  src={item.image}
                  alt={item.name}
                  width={48}
                  height={48}
                  className="rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.quantity} x {formatUsd(item.unitPriceCents)}
                  </p>
                  {formatVes(item.unitPriceCents) ? (
                    <p className="text-xs text-slate-500">
                      {item.quantity} x {formatVes(item.unitPriceCents)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <div className="text-right">
                <p>{formatUsd(subtotalCents)}</p>
                {formatVes(subtotalCents) ? (
                  <p className="text-xs text-slate-500">{formatVes(subtotalCents)}</p>
                ) : null}
              </div>
            </div>
            <div className="flex justify-between">
              <span>Impuestos</span>
              <div className="text-right">
                <p>{formatUsd(taxCents)}</p>
                {formatVes(taxCents) ? (
                  <p className="text-xs text-slate-500">{formatVes(taxCents)}</p>
                ) : null}
              </div>
            </div>
            {fulfillmentType === "DELIVERY" ? (
              <div className="flex justify-between">
                <span>Envio</span>
                <div className="text-right">
                  <p>
                    {deliveryFeeToApply === 0 ? "Gratis" : formatUsd(deliveryFeeToApply)}
                  </p>
                  {deliveryFeeToApply > 0 && formatVes(deliveryFeeToApply) ? (
                    <p className="text-xs text-slate-500">
                      {formatVes(deliveryFeeToApply)}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <div className="text-right">
                <p>{formatUsd(totalCents)}</p>
                {formatVes(totalCents) ? (
                  <p className="text-xs text-slate-500">{formatVes(totalCents)}</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {step === "PAYMENT" && selectedInstruction ? (
          <div className="rounded-lg border border-primary-200 bg-primary-50/60 p-4 dark:border-primary-900 dark:bg-primary-950/20">
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">
              Metodo seleccionado
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {selectedInstruction.label}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {paymentMethod === "IN_STORE"
                ? "No necesitas referencia ni comprobante para pagar en tienda."
                : requiresPaymentSupport
                  ? "Debes adjuntar un comprobante o indicar una referencia para finalizar."
                  : "Puedes adjuntar un comprobante o indicar una referencia para agilizar la validacion."}
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 p-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-500">
              {step === "DETAILS" ? "Total estimado" : "Total a pagar"}
            </p>
            <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
              {formatUsd(totalCents)}
              {formatVes(totalCents) ? ` / ${formatVes(totalCents)}` : ""}
            </p>
          </div>

          {step === "DETAILS" ? (
            <Button
              type="button"
              className="min-w-[140px]"
              onClick={handleGoToPaymentStep}
              disabled={!isStoreOpen}
            >
              Siguiente
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("DETAILS")}
              >
                Volver
              </Button>
              <Button type="submit" disabled={submitting || uploadingProof || !isStoreOpen}>
                {submitting ? "Procesando..." : "Finalizar"}
              </Button>
            </div>
          )}
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>
    </form>
  );
}
