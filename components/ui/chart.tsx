"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

function ChartContainer({
  id,
  className,
  config,
  children,
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const chartId = React.useId();
  const containerId = id ?? `chart-${chartId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={containerId}
        className={cn("h-64 w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-slate-500", className)}
      >
        <ChartStyle id={containerId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([, item]) => item.color);
  if (!entries.length) return null;

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: entries
          .map(
            ([key, item]) =>
              `[data-chart=${id}] [data-chart-key="${key}"] { --color-chart: ${item.color}; }`,
          )
          .join("\n"),
      }}
    />
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number | string }>;
  label?: React.ReactNode;
  hideLabel?: boolean;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-xs shadow-sm dark:bg-slate-900">
      {!hideLabel ? <p className="mb-2 font-medium">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((item: { dataKey?: string; value?: number | string }) => {
          const key = String(item.dataKey ?? "");
          const itemConfig = config[key];
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-slate-600 dark:text-slate-300">
                {itemConfig?.label ?? key}
              </span>
              <span className="font-medium">{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  payload,
}: {
  payload?: Array<{ value?: string; dataKey?: string; color?: string }>;
}) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.value ?? "");
        const itemConfig = config[key];
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: item.color ?? itemConfig?.color ?? "#94a3b8" }}
            />
            <span>{itemConfig?.label ?? key}</span>
          </div>
        );
      })}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
