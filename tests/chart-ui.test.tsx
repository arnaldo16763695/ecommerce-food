// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: () => null,
  Legend: () => null,
}));

import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
} from "../components/ui/chart";

describe("chart ui helpers", () => {
  it("injects css variables for configured chart keys", () => {
    const { container } = render(
      <ChartContainer
        id="sales-chart"
        config={{ revenue: { label: "Ingresos", color: "var(--color-primary-500)" } }}
      >
        <div data-chart-key="revenue">Series</div>
      </ChartContainer>,
    );

    const chartRoot = container.querySelector('[data-chart="sales-chart"]');
    const styleTag = container.querySelector("style");

    expect(chartRoot).toBeInTheDocument();
    expect(styleTag?.textContent).toContain('[data-chart=sales-chart] [data-chart-key="revenue"]');
    expect(styleTag?.textContent).toContain("--color-chart: var(--color-primary-500)");
  });

  it("renders tooltip and legend labels from chart config", () => {
    render(
      <ChartContainer
        config={{ revenue: { label: "Ingresos", color: "rgb(1, 2, 3)" } }}
      >
        <div>
          <ChartTooltipContent
            active
            label="Hoy"
            payload={[{ dataKey: "revenue", value: 42 }]}
          />
          <ChartLegendContent payload={[{ dataKey: "revenue" }]} />
        </div>
      </ChartContainer>,
    );

    expect(screen.getByText("Hoy")).toBeInTheDocument();
    const labels = screen.getAllByText("Ingresos");
    expect(labels).toHaveLength(2);
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(labels[1].previousElementSibling).toHaveStyle({
      backgroundColor: "rgb(1, 2, 3)",
    });
  });

  it("does not render tooltip content when inactive", () => {
    const { container } = render(
      <ChartContainer config={{ revenue: { label: "Ingresos" } }}>
        <ChartTooltipContent
          active={false}
          label="Hoy"
          payload={[{ dataKey: "revenue", value: 42 }]}
        />
      </ChartContainer>,
    );

    expect(container).not.toHaveTextContent("Hoy");
    expect(container).not.toHaveTextContent("42");
  });
});
