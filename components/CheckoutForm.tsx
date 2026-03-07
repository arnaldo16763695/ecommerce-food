"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store/cartStore";
import { resolveProductImageSrc } from "@/lib/product-image";
import type { AllProducts } from "@/lib/data/productsData";
import Image from "next/image";
import {
  convertUsdCentsToVesCents,
  formatCurrencyFromCents,
} from "@/lib/money";

type Props = {
  products: AllProducts[];
  usdToVesRate: number | null;
};

export default function CheckoutForm({ products, usdToVesRate }: Props) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const hydrateFromServer = useCartStore((state) => state.hydrateFromServer);
  const isHydratedFromServer = useCartStore((state) => state.isHydratedFromServer);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [orderNotes, setOrderNotes] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [addressNotes, setAddressNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydratedFromServer) {
      void hydrateFromServer();
    }
  }, [hydrateFromServer, isHydratedFromServer]);

  const displayItems = useMemo(() => {
    return items
      .map((item) => {
        const productId = item.productId ?? item.id;
        const product = products.find((p) => p.id === productId);
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
  const deliveryFeeCents =
    fulfillmentType === "DELIVERY" ? (subtotalCents >= 10_000 ? 0 : 1_000) : 0;
  const totalCents = subtotalCents + taxCents + deliveryFeeCents;

  const formatUsd = (cents: number) => formatCurrencyFromCents(cents, "USD", "en-US");
  const formatVes = (cents: number) =>
    usdToVesRate
      ? formatCurrencyFromCents(
          convertUsdCentsToVesCents(cents, usdToVesRate),
          "VES",
          "es-VE",
        )
      : null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!customerPhone.trim() && !customerEmail.trim()) {
        throw new Error("Debes indicar telefono o email para contactarte.");
      }

      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        fulfillmentType,
        notes: orderNotes.trim() || undefined,
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
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error inesperado al finalizar compra.",
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
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
      <section className="space-y-4 lg:col-span-2">
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
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Telefono</label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
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
                  onChange={(e) => setAddress1(e.target.value)}
                  required={fulfillmentType === "DELIVERY"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Apto/Piso (opcional)</label>
                <Input value={address2} onChange={(e) => setAddress2(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ciudad (opcional)</label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium">Notas de direccion</label>
                <textarea
                  value={addressNotes}
                  onChange={(e) => setAddressNotes(e.target.value)}
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
            onChange={(e) => setOrderNotes(e.target.value)}
            rows={3}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </section>

      <aside className="space-y-4">
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
                  <p>{deliveryFeeCents === 0 ? "Gratis" : formatUsd(deliveryFeeCents)}</p>
                  {deliveryFeeCents > 0 && formatVes(deliveryFeeCents) ? (
                    <p className="text-xs text-slate-500">{formatVes(deliveryFeeCents)}</p>
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

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Procesando..." : "Confirmar pedido"}
        </Button>
      </aside>
    </form>
  );
}
