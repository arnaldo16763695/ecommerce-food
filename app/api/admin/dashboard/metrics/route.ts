import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type RevenuePoint = {
  date: string;
  label: string;
  revenueCents: number;
  orders: number;
};

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const nextDayStart = addDays(todayStart, 1);
  const sevenDaysStart = addDays(todayStart, -6);
  const thirtyDaysStart = addDays(todayStart, -29);

  const [orders30, statusGroups, fulfillmentGroups, recentOrders, orderItems30] =
    await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: thirtyDaysStart },
        },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          fulfillmentType: true,
          totalCents: true,
          createdAt: true,
        },
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ["fulfillmentType"],
        where: {
          createdAt: { gte: thirtyDaysStart },
        },
        _count: { _all: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          customerName: true,
          totalCents: true,
          createdAt: true,
        },
      }),
      prisma.orderItem.findMany({
        where: {
          order: {
            createdAt: { gte: thirtyDaysStart },
            status: { not: "CANCELED" },
          },
        },
        select: {
          nameSnapshot: true,
          quantity: true,
          unitPriceCents: true,
        },
      }),
    ]);

  const paidOrders30 = orders30.filter((order) => order.paymentStatus === "PAID");
  const paidRevenue30 = paidOrders30.reduce((sum, order) => sum + order.totalCents, 0);
  const paidRevenue7 = paidOrders30
    .filter((order) => order.createdAt >= sevenDaysStart)
    .reduce((sum, order) => sum + order.totalCents, 0);
  const paidRevenueToday = paidOrders30
    .filter((order) => order.createdAt >= todayStart && order.createdAt < nextDayStart)
    .reduce((sum, order) => sum + order.totalCents, 0);

  const avgTicket30 =
    paidOrders30.length > 0 ? Math.round(paidRevenue30 / paidOrders30.length) : 0;

  const activeOrders = statusGroups
    .filter(
      (group) => group.status !== "COMPLETED" && group.status !== "CANCELED",
    )
    .reduce((sum, group) => sum + group._count._all, 0);

  const dailyRevenue: RevenuePoint[] = Array.from({ length: 30 }).map((_, idx) => {
    const dayStart = addDays(thirtyDaysStart, idx);
    const dayEnd = addDays(dayStart, 1);
    const dayPaidOrders = paidOrders30.filter(
      (order) => order.createdAt >= dayStart && order.createdAt < dayEnd,
    );
    return {
      date: dayStart.toISOString(),
      label: dayStart.toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
      }),
      revenueCents: dayPaidOrders.reduce((sum, order) => sum + order.totalCents, 0),
      orders: dayPaidOrders.length,
    };
  });

  const topProductsMap = new Map<
    string,
    { name: string; quantity: number; revenueCents: number }
  >();
  for (const item of orderItems30) {
    const key = item.nameSnapshot.trim();
    const prev = topProductsMap.get(key);
    const itemRevenue = item.unitPriceCents * item.quantity;
    if (prev) {
      prev.quantity += item.quantity;
      prev.revenueCents += itemRevenue;
    } else {
      topProductsMap.set(key, {
        name: key,
        quantity: item.quantity,
        revenueCents: itemRevenue,
      });
    }
  }
  const topProducts = Array.from(topProductsMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6);

  return NextResponse.json({
    data: {
      summary: {
        paidRevenueToday,
        paidRevenue7,
        paidRevenue30,
        paidOrders30: paidOrders30.length,
        avgTicket30,
        activeOrders,
      },
      dailyRevenue,
      statusDistribution: statusGroups.map((group) => ({
        status: group.status,
        count: group._count._all,
      })),
      fulfillmentDistribution: fulfillmentGroups.map((group) => ({
        fulfillmentType: group.fulfillmentType,
        count: group._count._all,
      })),
      topProducts,
      recentOrders,
    },
  });
}
