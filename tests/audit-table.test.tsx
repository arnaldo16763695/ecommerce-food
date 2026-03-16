// @vitest-environment jsdom

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
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

import AuditTable from "../app/(mangment)/admin/audit/audit-table";

const fetchMock = vi.fn();

describe("AuditTable", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("loads and renders audit log rows", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: "log_1",
            action: "UPDATE",
            entityType: "USER",
            entityId: "user_2",
            entityLabel: "Ana",
            summary: "Actualizo el rol del usuario.",
            routePath: "/api/admin/users/user_2",
            method: "PATCH",
            ipAddress: "127.0.0.1",
            metadata: null,
            actorRole: "ADMIN",
            createdAt: "2026-03-16T10:00:00.000Z",
            actorUser: {
              id: "admin_1",
              name: "Administrador",
              email: "admin@example.com",
            },
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      }),
    });

    render(<AuditTable />);

    await screen.findByText("Actualizo el rol del usuario.");

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/audit-logs?page=1&limit=20", {
      method: "GET",
      cache: "no-store",
    });
    expect(screen.getByText("Administrador")).toBeInTheDocument();
    expect(screen.getAllByText("UPDATE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("USER").length).toBeGreaterThan(0);
    expect(screen.getByText("1-1 de 1 movimientos")).toBeInTheDocument();
  });

  it("renders an error when the request fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Sin acceso" }),
    });

    render(<AuditTable />);

    await waitFor(() => {
      expect(screen.getByText("Sin acceso")).toBeInTheDocument();
    });
  });
});
