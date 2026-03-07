"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

type KitchenOrder = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentType: FulfillmentType;
  customerName: string;
  totalCents: number;
  createdAt: string;
  assignedPreparer: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  _count: {
    items: number;
  };
};

type OrdersResponse = {
  data: KitchenOrder[];
};

type KitchenOrderDetail = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentType: FulfillmentType;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  notes: string | null;
  assignedAt: string | null;
  assignedPreparer: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  createdAt: string;
  preparationItems: Array<{
    id: string;
    orderItemId: string;
    isPrepared: boolean;
    preparedAt: string | null;
    preparedByUser: {
      id: string;
      name: string | null;
      email: string | null;
    } | null;
  }>;
  items: Array<{
    id: string;
    nameSnapshot: string;
    unitPriceCents: number;
    quantity: number;
    notes: string | null;
    options: Array<{
      id: string;
      groupNameSnapshot: string;
      optionNameSnapshot: string;
      priceDeltaCents: number;
      quantity: number;
    }>;
  }>;
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-VE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: OrderStatus) {
  switch (status) {
    case "CONFIRMED":
      return "Confirmado";
    case "PREPARING":
      return "Preparando";
    case "READY":
      return "Listo";
    default:
      return status;
  }
}

export default function KitchenBoard() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeOrderDetail, setActiveOrderDetail] = useState<KitchenOrderDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingOrderItemId, setSavingOrderItemId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        status: "ALL",
      });

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo cargar pedidos de cocina.");
      }

      const payload = (await res.json()) as OrdersResponse;
      const filtered = (payload.data ?? []).filter(
        (order) =>
          order.status === "CONFIRMED" ||
          order.status === "PREPARING" ||
          order.status === "READY",
      );
      setOrders(filtered);
    } catch (err) {
      toast({
        title: "Error en cocina",
        description:
          err instanceof Error ? err.message : "Error inesperado cargando pedidos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadOrders();
    }, 10000);
    return () => clearInterval(timer);
  }, [loadOrders]);

  const grouped = useMemo(() => {
    return {
      CONFIRMED: orders.filter((order) => order.status === "CONFIRMED"),
      PREPARING: orders.filter((order) => order.status === "PREPARING"),
      READY: orders.filter((order) => order.status === "READY"),
    };
  }, [orders]);

  const preparedSummary = useMemo(() => {
    if (!activeOrderDetail) {
      return { total: 0, done: 0, isComplete: false };
    }

    const total = activeOrderDetail.items.length;
    const done = activeOrderDetail.items.reduce((sum, item) => {
      const prepared = activeOrderDetail.preparationItems.some(
        (prep) => prep.orderItemId === item.id && prep.isPrepared,
      );
      return sum + (prepared ? 1 : 0);
    }, 0);

    return { total, done, isComplete: total > 0 && done === total };
  }, [activeOrderDetail]);

  const canManageActiveOrder = useMemo(() => {
    if (!activeOrderDetail || !session?.user) return false;
    if (session.user.role === "ADMIN") return true;
    return activeOrderDetail.assignedPreparer?.id === session.user.id;
  }, [activeOrderDetail, session?.user]);

  const fetchOrderDetail = useCallback(
    async (orderId: string) => {
      setDetailLoading(true);

      try {
        const res = await fetch(`/api/admin/orders/${orderId}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "No se pudo cargar el detalle del pedido.");
        }

        const body = (await res.json()) as { data: KitchenOrderDetail };
        setActiveOrderDetail(body.data);
      } catch (err) {
        toast({
          title: "Error en detalle",
          description:
            err instanceof Error ? err.message : "Error inesperado cargando detalle.",
          variant: "destructive",
        });
      } finally {
        setDetailLoading(false);
      }
    },
    [toast],
  );

  function openOrderDetail(orderId: string) {
    setDetailOpen(true);
    setActiveOrderDetail(null);
    void fetchOrderDetail(orderId);
  }

  async function togglePrepared(orderId: string, itemId: string, isPrepared: boolean) {
    setSavingOrderItemId(itemId);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/preparation/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPrepared }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo actualizar el checklist.");
      }

      const body = (await res.json()) as {
        data: {
          id: string;
          orderId: string;
          orderItemId: string;
          isPrepared: boolean;
          preparedAt: string | null;
          preparedByUser: {
            id: string;
            name: string | null;
            email: string | null;
          } | null;
        };
      };

      setActiveOrderDetail((prev) => {
        if (!prev || prev.id !== orderId) return prev;

        const existing = prev.preparationItems.find(
          (item) => item.orderItemId === itemId,
        );

        if (existing) {
          return {
            ...prev,
            preparationItems: prev.preparationItems.map((item) =>
              item.orderItemId === itemId ? body.data : item,
            ),
          };
        }

        return {
          ...prev,
          preparationItems: [...prev.preparationItems, body.data],
        };
      });
    } catch (err) {
      toast({
        title: "No se pudo actualizar checklist",
        description:
          err instanceof Error ? err.message : "Error inesperado actualizando item.",
        variant: "destructive",
      });
    } finally {
      setSavingOrderItemId(null);
    }
  }

  async function handleStatusChange(orderId: string, status: "PREPARING" | "READY") {
    if (status === "READY" && activeOrderDetail?.id === orderId && !preparedSummary.isComplete) {
      toast({
        title: "Checklist incompleto",
        description: "Marca todos los items como listos antes de pasar a READY.",
        variant: "destructive",
      });
      return;
    }

    setSavingOrderId(orderId);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo actualizar el pedido.");
      }

      toast({
        title: "Pedido actualizado",
        description: `Estado cambiado a ${statusLabel(status)}.`,
      });
      await loadOrders();
      await fetchOrderDetail(orderId);
    } catch (err) {
      toast({
        title: "No se pudo actualizar",
        description:
          err instanceof Error ? err.message : "Error inesperado actualizando pedido.",
        variant: "destructive",
      });
    } finally {
      setSavingOrderId(null);
    }
  }

  const columns: Array<{
    key: "CONFIRMED" | "PREPARING" | "READY";
    title: string;
    orders: KitchenOrder[];
  }> = [
    { key: "CONFIRMED", title: "Confirmados", orders: grouped.CONFIRMED },
    { key: "PREPARING", title: "Preparando", orders: grouped.PREPARING },
    { key: "READY", title: "Listos", orders: grouped.READY },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Actualizacion automatica cada 10 segundos.
        </p>
        <Button variant="outline" onClick={() => void loadOrders()} disabled={loading}>
          Actualizar ahora
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {columns.map((column) => (
          <article
            key={column.key}
            className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800"
          >
            <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {column.title} ({column.orders.length})
            </h2>

            <div className="space-y-2">
              {column.orders.length === 0 ? (
                <p className="text-xs text-slate-500">Sin pedidos en esta columna.</p>
              ) : (
                column.orders.map((order) => (
                  <div
                    key={order.id}
                    className="space-y-1.5 rounded-md border border-slate-200 p-2 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        #{order.orderNumber}
                      </p>
                      <Badge
                        variant={order.fulfillmentType === "DELIVERY" ? "secondary" : "outline"}
                        className="text-[10px]"
                      >
                        {order.fulfillmentType === "DELIVERY" ? "Delivery" : "Retiro"}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-slate-700 dark:text-slate-200">
                      {order.customerName}
                    </p>
                    <p className="text-[11px] text-slate-500">{formatDate(order.createdAt)}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-200">
                      {order._count.items} items - {formatMoney(order.totalCents)}
                    </p>
                    <Button
                      variant="outline"
                      className="h-8 w-full text-xs"
                      onClick={() => openOrderDetail(order.id)}
                    >
                      Ver detalle
                    </Button>

                    {column.key === "CONFIRMED" ? (
                      <Button
                        className="h-8 w-full text-xs"
                        disabled={savingOrderId === order.id}
                        onClick={() => void handleStatusChange(order.id, "PREPARING")}
                      >
                        Iniciar preparacion
                      </Button>
                    ) : null}

                    {column.key === "PREPARING" ? (
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-slate-500">
                          Marcar listo desde el detalle (checklist).
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Asignado a:{" "}
                          {order.assignedPreparer?.name ??
                            order.assignedPreparer?.email ??
                            "Sin asignar"}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </article>
        ))}
      </div>

      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {activeOrderDetail ? `Pedido #${activeOrderDetail.orderNumber}` : "Detalle de pedido"}
            </SheetTitle>
            <SheetDescription>
              Revisa y marca cada item para completar la preparacion.
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="px-4 py-2 text-sm text-slate-500">Cargando detalle...</div>
          ) : activeOrderDetail ? (
            <div className="space-y-4 px-4 pb-2">
              <div className="space-y-1 rounded-md border p-3 text-sm">
                <p>
                  <span className="font-medium">Cliente:</span> {activeOrderDetail.customerName}
                </p>
                <p>
                  <span className="font-medium">Estado:</span> {statusLabel(activeOrderDetail.status)}
                </p>
                <p>
                  <span className="font-medium">Tipo:</span>{" "}
                  {activeOrderDetail.fulfillmentType === "DELIVERY" ? "Delivery" : "Retiro"}
                </p>
                <p>
                  <span className="font-medium">Total:</span>{" "}
                  {formatMoney(activeOrderDetail.totalCents)}
                </p>
                <p className="text-xs text-slate-500">
                  Progreso: {preparedSummary.done}/{preparedSummary.total} items listos
                </p>
                {activeOrderDetail.assignedPreparer ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Asignado a:</span>{" "}
                    {activeOrderDetail.assignedPreparer.name ??
                      activeOrderDetail.assignedPreparer.email}
                  </p>
                ) : null}
                {activeOrderDetail.notes ? (
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-medium">Observaciones del pedido:</span>{" "}
                    {activeOrderDetail.notes}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                {activeOrderDetail.items.map((item) => {
                  const checked = activeOrderDetail.preparationItems.some(
                    (prep) => prep.orderItemId === item.id && prep.isPrepared,
                  );

                  return (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-start gap-3 rounded-md border p-2"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 size-4"
                        checked={checked}
                        disabled={
                          activeOrderDetail.status !== "PREPARING" ||
                          !canManageActiveOrder ||
                          savingOrderItemId === item.id
                        }
                        onChange={(e) =>
                          void togglePrepared(
                            activeOrderDetail.id,
                            item.id,
                            e.currentTarget.checked,
                          )
                        }
                      />
                      <div className="min-w-0 text-sm">
                        <p className="font-medium">
                          {item.quantity}x {item.nameSnapshot}
                        </p>
                        {item.options.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {item.options.map((option) => (
                              <Badge
                                key={option.id}
                                variant="outline"
                                className="border-amber-300 bg-amber-100 text-[10px] text-amber-900 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-200"
                              >
                                {option.quantity}x {option.groupNameSnapshot}:{" "}
                                {option.optionNameSnapshot}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        {item.notes ? <p className="text-xs text-slate-500">Nota: {item.notes}</p> : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="px-4 py-2 text-sm text-slate-500">
              Selecciona un pedido para ver el detalle.
            </div>
          )}

          <SheetFooter className="border-t">
            {activeOrderDetail?.status === "CONFIRMED" ? (
              <Button
                className="w-full"
                disabled={savingOrderId === activeOrderDetail.id}
                onClick={() => void handleStatusChange(activeOrderDetail.id, "PREPARING")}
              >
                Iniciar preparacion
              </Button>
            ) : null}

            {activeOrderDetail?.status === "PREPARING" ? (
              <div className="w-full space-y-2">
                {!canManageActiveOrder ? (
                  <p className="text-center text-xs text-amber-600">
                    Este pedido esta bloqueado para otro preparador.
                  </p>
                ) : null}
                <Button
                  className="w-full"
                  disabled={
                    savingOrderId === activeOrderDetail.id ||
                    !preparedSummary.isComplete ||
                    !canManageActiveOrder
                  }
                  onClick={() => void handleStatusChange(activeOrderDetail.id, "READY")}
                >
                  Marcar pedido como listo
                </Button>
              </div>
            ) : null}

            {activeOrderDetail?.status === "READY" ? (
              <p className="text-center text-sm text-green-600">
                Pedido listo para entrega.
              </p>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}
