"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

type DashboardMetrics = {
  summary: {
    paidRevenueToday: number;
    paidRevenue7: number;
    paidRevenue30: number;
    paidOrders30: number;
    avgTicket30: number;
    activeOrders: number;
  };
  dailyRevenue: Array<{
    date: string;
    label: string;
    revenueCents: number;
    orders: number;
  }>;
  statusDistribution: Array<{
    status: string;
    count: number;
  }>;
  fulfillmentDistribution: Array<{
    fulfillmentType: "PICKUP" | "DELIVERY";
    count: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenueCents: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: number;
    status: string;
    paymentStatus: string;
    customerName: string;
    totalCents: number;
    createdAt: string;
  }>;
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusToLabel(status: string) {
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

function paymentToLabel(paymentStatus: string) {
  switch (paymentStatus) {
    case "UNPAID":
      return "No pagado";
    case "PAID":
      return "Pagado";
    case "REFUNDED":
      return "Reembolsado";
    default:
      return paymentStatus;
  }
}

export default function DashboardPanels() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard/metrics", {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "No se pudieron cargar metricas.");
      }
      const body = (await res.json()) as { data: DashboardMetrics };
      setMetrics(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-slate-600">Cargando metricas...</p>;
  }

  if (error || !metrics) {
    return <p className="text-sm text-red-600">{error ?? "No hay metricas."}</p>;
  }

  const revenueChartConfig = {
    revenueCents: {
      label: "Ingresos",
      color: "var(--color-primary-500)",
    },
  } satisfies ChartConfig;

  const statusChartData = metrics.statusDistribution.map((item) => ({
    ...item,
    label: statusToLabel(item.status),
  }));
  const statusChartConfig = {
    count: { label: "Pedidos", color: "var(--color-info-500)" },
  } satisfies ChartConfig;

  const fulfillmentChartConfig = {
    PICKUP: { label: "Retiro", color: "var(--color-success-500)" },
    DELIVERY: { label: "Delivery", color: "var(--color-warning-500)" },
  } satisfies ChartConfig;
  const pieColors = ["var(--color-success-500)", "var(--color-warning-500)"];

  const topProductsChartConfig = {
    quantity: { label: "Unidades", color: "var(--color-secondary-500)" },
  } satisfies ChartConfig;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Ventas hoy</CardTitle>
            <CardDescription>Solo pedidos pagados</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(metrics.summary.paidRevenueToday)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ventas 7 dias</CardTitle>
            <CardDescription>Ultima semana</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(metrics.summary.paidRevenue7)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ticket promedio</CardTitle>
            <CardDescription>Ultimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(metrics.summary.avgTicket30)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pedidos activos</CardTitle>
            <CardDescription>Pendiente a entrega</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {metrics.summary.activeOrders}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ventas por dia</CardTitle>
            <CardDescription>Tendencia de los ultimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-64">
              <LineChart data={metrics.dailyRevenue}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />
                <Line
                  type="monotone"
                  dataKey="revenueCents"
                  stroke="var(--color-chart)"
                  strokeWidth={2}
                  dot={false}
                  data-chart-key="revenueCents"
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos por estado</CardTitle>
            <CardDescription>Distribucion actual</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusChartConfig} className="h-64">
              <BarChart data={statusChartData} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  width={92}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="count" fill="var(--color-chart)" radius={4} data-chart-key="count" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Pickup vs Delivery</CardTitle>
            <CardDescription>Ultimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={fulfillmentChartConfig} className="h-64">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={metrics.fulfillmentDistribution}
                  dataKey="count"
                  nameKey="fulfillmentType"
                  innerRadius={50}
                  outerRadius={84}
                >
                  {metrics.fulfillmentDistribution.map((item, idx) => (
                    <Cell
                      key={item.fulfillmentType}
                      fill={pieColors[idx % pieColors.length]}
                      data-chart-key={item.fulfillmentType}
                    />
                  ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent />}
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top productos</CardTitle>
            <CardDescription>Mas vendidos en 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.topProducts.length === 0 ? (
              <p className="text-sm text-slate-500">Sin datos aun.</p>
            ) : (
              <ChartContainer config={topProductsChartConfig} className="h-64">
                <BarChart data={metrics.topProducts} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => String(value).slice(0, 10)}
                  />
                  <YAxis hide />
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Bar
                    dataKey="quantity"
                    fill="var(--color-chart)"
                    radius={4}
                    data-chart-key="quantity"
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ultimos pedidos</CardTitle>
          <CardDescription>Vista rapida operativa</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
