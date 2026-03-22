// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("../components/ui/use-toast", () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock("../components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-value={value}>{children}</div>,
}));

import OrdersTable from "../app/(mangment)/admin/orders/orders-table";

class MockEventSource {
  addEventListener() {}
  removeEventListener() {}
  close() {}
}

const ordersResponse = {
  data: [
    {
      id: "order_1",
      orderNumber: 201,
      status: "PENDING",
      paymentStatus: "UNPAID",
      paymentMethod: "MOBILE_PAYMENT",
      paymentReviewStatus: "PENDING",
      fulfillmentType: "PICKUP",
      customerName: "Ana Perez",
      totalCents: 4200,
      createdAt: "2026-03-17T10:00:00.000Z",
      paymentReference: "PM-001",
      paymentProofUrl: "https://example.com/proof.png",
      _count: {
        items: 2,
      },
    },
  ],
  meta: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
    reviewCounts: {
      pending: 1,
      approved: 0,
      rejected: 0,
      notRequired: 0,
    },
  },
};

describe("OrdersTable", () => {
  beforeEach(() => {
    toastMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ordersResponse,
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows payment reference and proof link in quick review", async () => {
    render(<OrdersTable />);

    await screen.findByText("Ana Perez");

    fireEvent.click(screen.getByRole("button", { name: "Revisar pago" }));

    expect(screen.getByText("PM-001")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir comprobante" })).toHaveAttribute(
      "href",
      "https://example.com/proof.png",
    );
  });

  it("requires a note before rejecting from quick review", async () => {
    render(<OrdersTable />);

    await screen.findByText("Ana Perez");

    fireEvent.click(screen.getByRole("button", { name: "Revisar pago" }));
    fireEvent.click(screen.getByRole("button", { name: "Rechazar comprobante" }));

    expect(toastMock).toHaveBeenCalledWith({
      title: "Falta el motivo del rechazo",
      description: "Debes indicar un motivo para rechazar el comprobante.",
      variant: "destructive",
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it("highlights when a paid order still needs confirmation", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...ordersResponse,
        data: [
          {
            ...ordersResponse.data[0],
            paymentStatus: "PAID",
            paymentReviewStatus: "APPROVED",
          },
        ],
      }),
    });

    render(<OrdersTable />);

    await screen.findByText("Pago aprobado. Falta confirmar el pedido.");
    expect(screen.getByRole("link", { name: "Confirmar pedido" })).toHaveAttribute(
      "href",
      "/admin/orders/order_1",
    );
  });
});
