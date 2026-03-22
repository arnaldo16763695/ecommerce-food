"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSelectablePaymentStatuses,
  getSelectableOrderStatuses,
  type FulfillmentType,
  type OrderStatus,
  type PaymentReviewStatus,
  type PaymentStatus,
} from "@/lib/order-workflow";
import {
  getAdminOrdersRealtimeEvent,
  getAdminOrdersRealtimeTopic,
} from "@/lib/realtime/admin-orders";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type AdminOrder = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: "MOBILE_PAYMENT" | "BANK_TRANSFER" | "IN_STORE" | null;
  paymentReviewStatus: PaymentReviewStatus;
  fulfillmentType: FulfillmentType;
  customerName: string;
  totalCents: number;
  createdAt: string;
  paymentReference?: string | null;
  paymentProofUrl?: string | null;
  _count: {
    items: number;
  };
};

type OrdersResponse = {
  data: AdminOrder[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    reviewCounts: {
      pending: number;
      approved: number;
      rejected: number;
      notRequired: number;
    };
  };
};

const LIMIT = 10;

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

function paymentReviewToLabel(status: PaymentReviewStatus) {
  switch (status) {
    case "NOT_REQUIRED":
      return "No requiere revisión";
    case "PENDING":
      return "Pendiente de revisión";
    case "APPROVED":
      return "Revisión aprobada";
    case "REJECTED":
      return "Revisión rechazada";
    default:
      return status;
  }
}

export default function OrdersTable() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [paymentReviewFilter, setPaymentReviewFilter] = useState<"ALL" | PaymentReviewStatus>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [reviewingOrder, setReviewingOrder] = useState<AdminOrder | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewCounts, setReviewCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    notRequired: 0,
  });

  const loadOrders = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        status: statusFilter,
        paymentReviewStatus: paymentReviewFilter,
      });
      if (query) params.set("q", query);

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo cargar la lista de pedidos");
      }

      const payload = (await res.json()) as OrdersResponse;
      setOrders(payload.data ?? []);
      setTotal(payload.meta?.total ?? 0);
      setTotalPages(Math.max(1, payload.meta?.totalPages ?? 1));
      setReviewCounts(
        payload.meta?.reviewCounts ?? {
          pending: 0,
          approved: 0,
          rejected: 0,
          notRequired: 0,
        },
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al cargar pedidos";
      setError(message);
      if (!silent) {
        toast({
          title: "Error al cargar pedidos",
          description: message,
          variant: "destructive",
        });
      }
      setOrders([]);
      setTotal(0);
      setTotalPages(1);
      setReviewCounts({
        pending: 0,
        approved: 0,
        rejected: 0,
        notRequired: 0,
      });
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [page, paymentReviewFilter, query, statusFilter, toast]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const queueRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        void loadOrders({ silent: true });
      }, 250);
    };

    const supabase = getSupabaseBrowserClient();
    const realtimeChannel = supabase
      ?.channel(getAdminOrdersRealtimeTopic())
      .on("broadcast", { event: getAdminOrdersRealtimeEvent() }, () => {
        queueRefresh();
      });

    if (realtimeChannel) {
      void realtimeChannel.subscribe();
    }

    const refreshOnFocus = () => {
      void loadOrders({ silent: true });
    };

    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        void loadOrders({ silent: true });
      }
    };

    pollTimer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadOrders({ silent: true });
      }
    }, 30000);

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      if (pollTimer) clearInterval(pollTimer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
      if (realtimeChannel && supabase) {
        void supabase.removeChannel(realtimeChannel);
      }
    };
  }, [loadOrders]);

  const visibleRangeLabel = useMemo(() => {
    if (total === 0 || orders.length === 0) return "0 resultados";
    const from = (page - 1) * LIMIT + 1;
    const to = from + orders.length - 1;
    return `${from}-${to} de ${total} pedidos`;
  }, [page, total, orders.length]);

  async function handleStatusChange(orderId: string, status: OrderStatus) {
    setSavingOrderId(orderId);
    setError(null);

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
        throw new Error(body?.error ?? "No se pudo actualizar el estado");
      }

      const body = (await res.json()) as { data: AdminOrder };
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, ...body.data } : order,
        ),
      );
      toast({
        title: "Estado actualizado",
        description: `Pedido #${body.data.orderNumber} actualizado.`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al actualizar el estado";
      setError(message);
      toast({
        title: "No se pudo actualizar el estado",
        description: message,
        variant: "destructive",
      });
      await loadOrders();
    } finally {
      setSavingOrderId(null);
    }
  }

  async function handlePaymentStatusChange(
    orderId: string,
    paymentStatus: PaymentStatus,
  ) {
    setSavingOrderId(orderId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentStatus }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo actualizar el estado de pago");
      }

      const body = (await res.json()) as { data: AdminOrder };
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, ...body.data } : order,
        ),
      );
      toast({
        title: "Pago actualizado",
        description: `Pedido #${body.data.orderNumber} actualizado.`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al actualizar el estado de pago";
      setError(message);
      toast({
        title: "No se pudo actualizar el pago",
        description: message,
        variant: "destructive",
      });
      await loadOrders();
    } finally {
      setSavingOrderId(null);
    }
  }

  async function handleApprovePayment(order: AdminOrder) {
    const trimmedNote = reviewNote.trim();
    setSavingOrderId(order.id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "APPROVE_PAYMENT",
          ...(trimmedNote ? { reviewNote: trimmedNote } : {}),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo aprobar el pago.");
      }

      const body = (await res.json()) as { data: AdminOrder };
      setOrders((prev) =>
        prev.map((order) =>
          order.id === body.data.id ? { ...order, ...body.data } : order,
        ),
      );
      toast({
        title: "Pago aprobado",
        description: `Pedido #${body.data.orderNumber} aprobado correctamente.`,
      });
      setReviewNote("");
      setReviewingOrder(null);
      await loadOrders({ silent: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al aprobar el pago";
      setError(message);
      toast({
        title: "No se pudo aprobar el pago",
        description: message,
        variant: "destructive",
      });
      await loadOrders();
    } finally {
      setSavingOrderId(null);
    }
  }

  async function handleRejectPayment(order: AdminOrder) {
    const trimmedNote = reviewNote.trim();

    if (!trimmedNote) {
      toast({
        title: "Falta el motivo del rechazo",
        description: "Debes indicar un motivo para rechazar el comprobante.",
        variant: "destructive",
      });
      return;
    }

    setSavingOrderId(order.id);
    setError(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "REJECT_PAYMENT_REVIEW",
          reviewNote: trimmedNote,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo rechazar el comprobante.");
      }

      const body = (await res.json()) as { data: AdminOrder };
      setOrders((prev) =>
        prev.map((currentOrder) =>
          currentOrder.id === body.data.id ? { ...currentOrder, ...body.data } : currentOrder,
        ),
      );
      toast({
        title: "Comprobante rechazado",
        description: `Pedido #${body.data.orderNumber} actualizado correctamente.`,
      });
      setReviewNote("");
      setReviewingOrder(null);
      await loadOrders({ silent: true });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al rechazar el comprobante";
      setError(message);
      toast({
        title: "No se pudo rechazar el comprobante",
        description: message,
        variant: "destructive",
      });
      await loadOrders();
    } finally {
      setSavingOrderId(null);
    }
  }

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function shouldHighlightConfirmation(order: AdminOrder) {
    return (
      order.paymentStatus === "PAID" &&
      order.paymentReviewStatus === "APPROVED" &&
      order.status === "PENDING"
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por numero, nombre, telefono o email"
            className="sm:max-w-sm"
          />
          <Button type="submit" disabled={loading}>
            Buscar
          </Button>
        </form>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setPage(1);
            setStatusFilter(value as "ALL" | OrderStatus);
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Estado del pedido" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            <SelectItem value="PENDING">Pendiente</SelectItem>
            <SelectItem value="CONFIRMED">Confirmado</SelectItem>
            <SelectItem value="PREPARING">Preparando</SelectItem>
            <SelectItem value="READY">Listo</SelectItem>
            <SelectItem value="OUT_FOR_DELIVERY">En camino</SelectItem>
            <SelectItem value="COMPLETED">Completado</SelectItem>
            <SelectItem value="CANCELED">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={paymentReviewFilter}
          onValueChange={(value) => {
            setPage(1);
            setPaymentReviewFilter(value as "ALL" | PaymentReviewStatus);
          }}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Revisión de pago" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las revisiones</SelectItem>
            <SelectItem value="PENDING">Pendiente de revisión</SelectItem>
            <SelectItem value="APPROVED">Revisión aprobada</SelectItem>
            <SelectItem value="REJECTED">Revisión rechazada</SelectItem>
            <SelectItem value="NOT_REQUIRED">No requiere revisión</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-muted-foreground text-sm">{visibleRangeLabel}</p>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setPaymentReviewFilter("PENDING");
          }}
          className="rounded-lg border p-4 text-left transition hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-950/20"
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Pendientes
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {reviewCounts.pending}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Pagos por revisar
          </p>
        </button>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Aprobados</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {reviewCounts.approved}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Revisiones aprobadas
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Rechazados</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {reviewCounts.rejected}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Comprobantes rechazados
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Sin revisión</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {reviewCounts.notRequired}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Pago en tienda física
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Revision</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={10} className="text-muted-foreground py-8 text-center">
                Cargando pedidos...
              </TableCell>
            </TableRow>
          ) : orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-muted-foreground py-8 text-center">
                No hay pedidos para mostrar
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                <TableCell>{order.customerName}</TableCell>
                <TableCell>
                  <Badge variant={order.fulfillmentType === "DELIVERY" ? "secondary" : "outline"}>
                    {order.fulfillmentType === "DELIVERY" ? "Delivery" : "Retiro"}
                  </Badge>
                </TableCell>
                <TableCell>{order._count.items}</TableCell>
                <TableCell>{formatMoney(order.totalCents)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
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
                    <Select
                      value={order.paymentStatus}
                      disabled={savingOrderId === order.id}
                      onValueChange={(value) =>
                        handlePaymentStatusChange(order.id, value as PaymentStatus)
                      }
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Pago" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSelectablePaymentStatuses(order.paymentStatus).map(
                          (nextPaymentStatus) => (
                            <SelectItem key={nextPaymentStatus} value={nextPaymentStatus}>
                              {paymentToLabel(nextPaymentStatus)}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      order.paymentReviewStatus === "APPROVED"
                        ? "success"
                        : order.paymentReviewStatus === "REJECTED"
                          ? "warning"
                          : order.paymentReviewStatus === "PENDING"
                            ? "secondary"
                            : "outline"
                    }
                  >
                    {paymentReviewToLabel(order.paymentReviewStatus)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
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
                      <Select
                        value={order.status}
                        disabled={savingOrderId === order.id}
                        onValueChange={(value) =>
                          handleStatusChange(order.id, value as OrderStatus)
                        }
                      >
                        <SelectTrigger className="w-[170px]">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {getSelectableOrderStatuses(
                            order.status,
                            order.fulfillmentType,
                          ).map((nextStatus) => (
                            <SelectItem key={nextStatus} value={nextStatus}>
                              {statusToLabel(nextStatus)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {shouldHighlightConfirmation(order) ? (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Pago aprobado. Falta confirmar el pedido.
                      </p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  {new Date(order.createdAt).toLocaleString("es-VE", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {order.paymentReviewStatus === "PENDING" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={savingOrderId === order.id}
                        onClick={() => setReviewingOrder(order)}
                      >
                        Revisar pago
                      </Button>
                    ) : null}
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/orders/${order.id}`}>
                        {order.paymentReviewStatus === "PENDING"
                          ? "Revisar"
                          : shouldHighlightConfirmation(order)
                            ? "Confirmar pedido"
                            : "Ver detalle"}
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={loading || page <= 1}
        >
          Anterior
        </Button>
        <p className="text-sm">
          Pagina {page} de {totalPages}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={loading || page >= totalPages}
        >
          Siguiente
        </Button>
      </div>

      <Dialog
        open={Boolean(reviewingOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewingOrder(null);
            setReviewNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewingOrder
                ? `Revisión rápida del pedido #${reviewingOrder.orderNumber}`
                : "Revisión rápida"}
            </DialogTitle>
            <DialogDescription>
              Antes de aprobar, revisa la referencia y el comprobante del pago.
            </DialogDescription>
          </DialogHeader>

          {reviewingOrder ? (
            <div className="space-y-3 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Cliente
                  </p>
                  <p className="mt-1 font-medium">{reviewingOrder.customerName}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Total
                  </p>
                  <p className="mt-1 font-medium">
                    {formatMoney(reviewingOrder.totalCents)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Referencia
                  </p>
                  <p className="mt-1 font-medium">
                    {reviewingOrder.paymentReference || "Sin referencia"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Revisión actual
                  </p>
                  <p className="mt-1 font-medium">
                    {paymentReviewToLabel(reviewingOrder.paymentReviewStatus)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Comprobante
                </p>
                {reviewingOrder.paymentProofUrl ? (
                  <Link
                    href={reviewingOrder.paymentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex font-medium text-primary-700 hover:underline"
                  >
                    Abrir comprobante
                  </Link>
                ) : (
                  <p className="mt-1 font-medium">Sin comprobante adjunto</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="payment-review-note" className="text-sm font-medium">
                  Nota de revisión
                </label>
                <textarea
                  id="payment-review-note"
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  rows={4}
                  placeholder="Indica por qué apruebas o rechazas el comprobante."
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[96px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-muted-foreground text-xs">
                  La nota es obligatoria para rechazar y opcional para aprobar.
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReviewingOrder(null)}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!reviewingOrder || savingOrderId === reviewingOrder.id}
              onClick={() => reviewingOrder && void handleRejectPayment(reviewingOrder)}
            >
              {reviewingOrder && savingOrderId === reviewingOrder.id
                ? "Procesando..."
                : "Rechazar comprobante"}
            </Button>
            <Button
              type="button"
              disabled={!reviewingOrder || savingOrderId === reviewingOrder.id}
              onClick={() => reviewingOrder && void handleApprovePayment(reviewingOrder)}
            >
              {reviewingOrder && savingOrderId === reviewingOrder.id
                ? "Aprobando..."
                : "Aprobar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
