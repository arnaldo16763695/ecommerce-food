"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELED";

type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";
type FulfillmentType = "PICKUP" | "DELIVERY";

type PublicOrder = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentType: FulfillmentType;
  customerName: string;
  totalCents: number;
  createdAt: string;
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusToLabel(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return "Pendiente";
    case "CONFIRMED":
      return "Confirmado";
    case "PREPARING":
      return "Preparando";
    case "READY":
      return "Listo";
    case "OUT_FOR_DELIVERY":
      return "En camino";
    case "COMPLETED":
      return "Completado";
    case "CANCELED":
      return "Cancelado";
    default:
      return status;
  }
}

function paymentToLabel(status: PaymentStatus) {
  switch (status) {
    case "UNPAID":
      return "No pagado";
    case "PAID":
      return "Pagado";
    case "REFUNDED":
      return "Reembolsado";
    default:
      return status;
  }
}

export default function OrdersLookup() {
  const [orderNumber, setOrderNumber] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<PublicOrder[]>([]);

  async function fetchOrders(payload: { orderNumber?: number; contact?: string }) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudieron consultar los pedidos.");
      }

      const body = (await res.json()) as { data: PublicOrder[] };
      setOrders(body.data ?? []);
    } catch (err) {
      setOrders([]);
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function handleLookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const numericOrder = Number(orderNumber);
    const hasOrder = Number.isFinite(numericOrder) && numericOrder > 0;

    void fetchOrders({
      orderNumber: hasOrder ? numericOrder : undefined,
      contact: contact.trim() || undefined,
    });
  }

  function handleLoadMyOrders() {
    void fetchOrders({});
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Consultar pedidos
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Si no iniciaste sesion, usa numero de pedido + email o telefono.
        </p>
      </div>

      <form onSubmit={handleLookup} className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Numero de pedido</label>
          <Input
            inputMode="numeric"
            placeholder="Ej: 1024"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-sm font-medium">Email o telefono</label>
          <Input
            placeholder="correo@dominio.com o +58..."
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 md:col-span-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Consultando..." : "Buscar pedido"}
          </Button>
          <Button type="button" variant="outline" onClick={handleLoadMyOrders} disabled={loading}>
            Cargar mis pedidos (sesion)
          </Button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">Cargando...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Sin resultados aun.
          </p>
        ) : (
          orders.map((order) => (
            <article
              key={order.id}
              className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-slate-900 dark:text-slate-100">
                  Pedido #{order.orderNumber}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(order.createdAt).toLocaleString("es-VE", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    order.status === "COMPLETED"
                      ? "success"
                      : order.status === "CANCELED"
                        ? "warning"
                        : "outline"
                  }
                >
                  {statusToLabel(order.status)}
                </Badge>
                <Badge
                  variant={
                    order.paymentStatus === "PAID"
                      ? "success"
                      : order.paymentStatus === "REFUNDED"
                        ? "warning"
                        : "outline"
                  }
                >
                  {paymentToLabel(order.paymentStatus)}
                </Badge>
                <Badge variant={order.fulfillmentType === "DELIVERY" ? "secondary" : "outline"}>
                  {order.fulfillmentType === "DELIVERY" ? "Delivery" : "Retiro"}
                </Badge>
              </div>
              <div className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                <p>Cliente: {order.customerName}</p>
                <p>Total: {formatMoney(order.totalCents)}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
