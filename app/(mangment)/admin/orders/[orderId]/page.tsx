import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import prisma from "@/lib/prisma";

type Props = {
  params: Promise<{ orderId: string }>;
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

function paymentToLabel(status: string) {
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

async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      fulfillmentType: true,
      customerName: true,
      customerPhone: true,
      customerEmail: true,
      notes: true,
      subtotalCents: true,
      taxCents: true,
      discountCents: true,
      deliveryFeeCents: true,
      totalCents: true,
      createdAt: true,
      address: {
        select: {
          address1: true,
          address2: true,
          city: true,
          notes: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          nameSnapshot: true,
          unitPriceCents: true,
          quantity: true,
          notes: true,
          options: {
            orderBy: { optionNameSnapshot: "asc" },
            select: {
              id: true,
              groupNameSnapshot: true,
              optionNameSnapshot: true,
              priceDeltaCents: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/dashboard">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/orders">Pedidos</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Pedido #{order.orderNumber}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Pedido #{order.orderNumber}</h2>
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
              </div>
              <p className="text-sm text-slate-600">
                Creado:{" "}
                {new Date(order.createdAt).toLocaleString("es-VE", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-base font-semibold">Items del pedido</h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <article key={item.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{item.nameSnapshot}</p>
                      <p className="text-sm text-slate-600">
                        {item.quantity} x {formatMoney(item.unitPriceCents)}
                      </p>
                    </div>
                    {item.options.length > 0 ? (
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        {item.options.map((option) => (
                          <li key={option.id}>
                            {option.groupNameSnapshot}: {option.optionNameSnapshot}
                            {option.priceDeltaCents > 0
                              ? ` (+${formatMoney(option.priceDeltaCents)})`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {item.notes ? (
                      <p className="mt-2 text-sm text-slate-600">Nota: {item.notes}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-base font-semibold">Cliente</h3>
              <p className="text-sm">{order.customerName}</p>
              {order.customerPhone ? (
                <p className="text-sm text-slate-600">{order.customerPhone}</p>
              ) : null}
              {order.customerEmail ? (
                <p className="text-sm text-slate-600">{order.customerEmail}</p>
              ) : null}
              {order.notes ? (
                <p className="mt-2 text-sm text-slate-600">Notas: {order.notes}</p>
              ) : null}
            </div>

            {order.fulfillmentType === "DELIVERY" && order.address ? (
              <div className="rounded-lg border p-4">
                <h3 className="mb-3 text-base font-semibold">Direccion de entrega</h3>
                <p className="text-sm">{order.address.address1}</p>
                {order.address.address2 ? (
                  <p className="text-sm text-slate-600">{order.address.address2}</p>
                ) : null}
                {order.address.city ? (
                  <p className="text-sm text-slate-600">{order.address.city}</p>
                ) : null}
                {order.address.notes ? (
                  <p className="mt-2 text-sm text-slate-600">Notas: {order.address.notes}</p>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-lg border p-4">
              <h3 className="mb-3 text-base font-semibold">Resumen</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatMoney(order.subtotalCents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Impuestos</span>
                  <span>{formatMoney(order.taxCents)}</span>
                </div>
                {order.deliveryFeeCents > 0 ? (
                  <div className="flex justify-between">
                    <span>Envio</span>
                    <span>{formatMoney(order.deliveryFeeCents)}</span>
                  </div>
                ) : null}
                {order.discountCents > 0 ? (
                  <div className="flex justify-between">
                    <span>Descuento</span>
                    <span>-{formatMoney(order.discountCents)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(order.totalCents)}</span>
                </div>
              </div>
            </div>

            <Link href="/admin/orders" className="inline-flex text-sm text-amber-700 hover:underline">
              Volver a pedidos
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}

export default OrderDetailPage;
