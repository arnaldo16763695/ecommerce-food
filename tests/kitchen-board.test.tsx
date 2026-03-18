// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toastMock = vi.fn();
const fetchMock = vi.fn();
const subscribeMock = vi.fn();
const removeChannelMock = vi.fn();

let broadcastHandler: (() => void) | null = null;

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "prep_1",
        role: "PREPARER",
      },
    },
  }),
}));

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

vi.mock("../components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../lib/supabase/browser", () => ({
  getSupabaseBrowserClient: () => ({
    channel: () => ({
      on: (_type: string, _filter: unknown, callback: () => void) => {
        broadcastHandler = callback;
        return {
          subscribe: subscribeMock,
        };
      },
    }),
    removeChannel: removeChannelMock,
  }),
}));

import KitchenBoard from "../components/KitchenBoard";

describe("KitchenBoard", () => {
  beforeEach(() => {
    toastMock.mockReset();
    fetchMock.mockReset();
    subscribeMock.mockReset();
    removeChannelMock.mockReset();
    broadcastHandler = null;

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "order_1",
            orderNumber: 301,
            status: "CONFIRMED",
            paymentStatus: "PAID",
            fulfillmentType: "DELIVERY",
            customerName: "Ana Perez",
            totalCents: 5200,
            createdAt: "2026-03-18T10:00:00.000Z",
            assignedPreparer: null,
            _count: {
              items: 2,
            },
          },
        ],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  it("refreshes kitchen orders when a realtime broadcast arrives", async () => {
    render(<KitchenBoard />);

    await screen.findByText("#301");
    expect(subscribeMock).toHaveBeenCalled();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    broadcastHandler?.();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
