// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("recharts", () => {
  const renderChildren = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;

  return {
    ResponsiveContainer: renderChildren,
    LineChart: renderChildren,
    BarChart: renderChildren,
    PieChart: renderChildren,
    Pie: renderChildren,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    Line: () => <div data-testid="line-series" />,
    Bar: () => <div data-testid="bar-series" />,
    Cell: (props: Record<string, unknown>) => (
      <div
        data-testid={`cell-${String(props["data-chart-key"] ?? "unknown")}`}
        data-fill={String(props.fill ?? "")}
      />
    ),
  };
});

import DashboardPanels from "../app/(mangment)/admin/dashboard/dashboard-panels";

const fetchMock = vi.fn();

const metricsResponse = {
  data: {
    summary: {
      paidRevenueToday: 2000,
      paidRevenue7: 5000,
      paidRevenue30: 12000,
      paidOrders30: 8,
      avgTicket30: 1500,
      activeOrders: 3,
    },
    dailyRevenue: [
      { date: "2026-03-01", label: "01/03", revenueCents: 1000, orders: 1 },
      { date: "2026-03-02", label: "02/03", revenueCents: 2000, orders: 2 },
    ],
    statusDistribution: [
      { status: "PENDING", count: 2 },
      { status: "PREPARING", count: 1 },
    ],
    fulfillmentDistribution: [
      { fulfillmentType: "PICKUP" as const, count: 3 },
      { fulfillmentType: "DELIVERY" as const, count: 5 },
    ],
    topProducts: [
      { name: "Burger Clasica", quantity: 6, revenueCents: 6000 },
      { name: "Papas", quantity: 4, revenueCents: 2000 },
    ],
    recentOrders: [
      {
        id: "ord_1",
        orderNumber: 101,
        status: "PREPARING",
        paymentStatus: "PAID",
        customerName: "Ana",
        totalCents: 3000,
        createdAt: "2026-03-10T15:30:00.000Z",
      },
    ],
  },
};

describe("DashboardPanels", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders dashboard metrics after loading", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => metricsResponse,
    });

    render(<DashboardPanels />);

    expect(screen.getByText("Cargando metricas...")).toBeInTheDocument();

    await screen.findByText("Ventas hoy");

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/dashboard/metrics", {
      method: "GET",
      cache: "no-store",
    });
    expect(screen.getByText("$20.00")).toBeInTheDocument();
    expect(screen.getByText("Preparando")).toBeInTheDocument();
    expect(screen.getByText("Pagado")).toBeInTheDocument();
    expect(screen.getByTestId("cell-PICKUP")).toHaveAttribute(
      "data-fill",
      "var(--color-success-500)",
    );
    expect(screen.getByTestId("cell-DELIVERY")).toHaveAttribute(
      "data-fill",
      "var(--color-warning-500)",
    );
  });

  it("renders an api error message when the request fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Fallo dashboard" }),
    });

    render(<DashboardPanels />);

    await waitFor(() => {
      expect(screen.getByText("Fallo dashboard")).toBeInTheDocument();
    });
  });
});
