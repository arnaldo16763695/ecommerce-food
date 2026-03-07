"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  getSelectableOrderStatuses,
  type FulfillmentType,
  type OrderStatus,
} from "@/lib/order-workflow";

type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";

type AdminOrder = {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentType: FulfillmentType;
  customerName: string;
  totalCents: number;
  createdAt: string;
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

export default function OrdersTable() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        status: statusFilter,
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al cargar pedidos";
      setError(message);
      toast({
        title: "Error al cargar pedidos",
        description: message,
        variant: "destructive",
      });
      setOrders([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, query, statusFilter, toast]);

  useEffect(() => {
    loadOrders();
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

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
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
      </div>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-muted-foreground text-sm">{visibleRangeLabel}</p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Pago</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
                Cargando pedidos...
              </TableCell>
            </TableRow>
          ) : orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
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
                </TableCell>
                <TableCell>
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
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/orders/${order.id}`}>Ver detalle</Link>
                  </Button>
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
    </section>
  );
}
