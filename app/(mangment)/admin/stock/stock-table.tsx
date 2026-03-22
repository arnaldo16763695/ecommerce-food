"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";

type ProductVariant = {
  id: string;
  name: string;
  isActive: boolean;
  trackStock: boolean;
  stockQuantity: number;
};

type StockProduct = {
  id: string;
  name: string;
  slug: string;
  trackStock: boolean;
  stockQuantity: number;
  isActive: boolean;
  category: {
    id: string;
    name: string;
  } | null;
  variants: ProductVariant[];
};

type ProductsResponse = {
  data: StockProduct[];
  meta: {
    total: number;
  };
};

type StockRow = {
  rowId: string;
  productId: string;
  productName: string;
  productSlug: string;
  categoryName: string;
  variantId?: string;
  variantName?: string;
  productIsActive: boolean;
  variantIsActive?: boolean;
  trackStock: boolean;
  stockQuantity: number;
};

type StockFilter = "ALL" | "TRACKED" | "LOW" | "SOLD_OUT";

function getStockBadge(row: StockRow) {
  if (!row.trackStock) return { label: "Sin control", variant: "outline" as const };
  if (row.stockQuantity <= 0) return { label: "Agotado", variant: "warning" as const };
  if (row.stockQuantity <= 5) return { label: "Bajo", variant: "warning" as const };
  return { label: "Disponible", variant: "success" as const };
}

export default function StockTable() {
  const { toast } = useToast();
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StockFilter>("ALL");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
      });
      if (query.trim()) {
        params.set("q", query.trim());
      }

      const response = await fetch(`/api/admin/products?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("No se pudo cargar el stock.");
      }

      const body = (await response.json()) as ProductsResponse;
      setProducts(body.data ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al cargar stock.";
      toast({
        title: "No se pudo cargar el stock",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [query, toast]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const rows = useMemo<StockRow[]>(() => {
    return products.flatMap((product) => {
      if (product.variants.length > 0) {
        return product.variants.map((variant) => ({
          rowId: `${product.id}:${variant.id}`,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          categoryName: product.category?.name ?? "-",
          variantId: variant.id,
          variantName: variant.name,
          productIsActive: product.isActive,
          variantIsActive: variant.isActive,
          trackStock: variant.trackStock,
          stockQuantity: variant.stockQuantity,
        }));
      }

      return [
        {
          rowId: product.id,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          categoryName: product.category?.name ?? "-",
          productIsActive: product.isActive,
          trackStock: product.trackStock,
          stockQuantity: product.stockQuantity,
        },
      ];
    });
  }, [products]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      switch (filter) {
        case "TRACKED":
          return row.trackStock;
        case "LOW":
          return row.trackStock && row.stockQuantity > 0 && row.stockQuantity <= 5;
        case "SOLD_OUT":
          return row.trackStock && row.stockQuantity <= 0;
        default:
          return true;
      }
    });
  }, [filter, rows]);

  const stockSummary = useMemo(() => {
    return {
      total: rows.length,
      tracked: rows.filter((row) => row.trackStock).length,
      low: rows.filter((row) => row.trackStock && row.stockQuantity > 0 && row.stockQuantity <= 5)
        .length,
      soldOut: rows.filter((row) => row.trackStock && row.stockQuantity <= 0).length,
    };
  }, [rows]);

  async function updateRowStock(row: StockRow) {
    const draftValue = drafts[row.rowId];
    const nextStock = Number.parseInt(draftValue ?? String(row.stockQuantity), 10);
    if (!Number.isFinite(nextStock) || nextStock < 0) {
      toast({
        title: "Stock inválido",
        description: "El stock debe ser un número entero igual o mayor a cero.",
        variant: "destructive",
      });
      return;
    }

    setSavingRowId(row.rowId);

    try {
      const response = await fetch(
        row.variantId
          ? `/api/admin/products/${row.productId}/variants/${row.variantId}`
          : `/api/admin/products/${row.productId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trackStock: true,
            stockQuantity: nextStock,
          }),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo actualizar el stock.");
      }

      toast({
        title: "Stock actualizado",
        description: row.variantName
          ? `Se actualizo el stock de ${row.productName} - ${row.variantName}.`
          : `Se actualizo el stock de ${row.productName}.`,
      });

      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.rowId];
        return next;
      });
      await loadRows();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar el stock.";
      toast({
        title: "No se pudo actualizar el stock",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSavingRowId(null);
    }
  }

  function applyDelta(row: StockRow, delta: number) {
    const currentValue = Number.parseInt(drafts[row.rowId] ?? String(row.stockQuantity), 10);
    const baseValue = Number.isFinite(currentValue) ? currentValue : row.stockQuantity;
    const nextValue = Math.max(0, baseValue + delta);
    setDrafts((prev) => ({
      ...prev,
      [row.rowId]: String(nextValue),
    }));
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchInput.trim());
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Control rápido de stock</h2>
          <p className="text-sm text-slate-500">
            Ajusta existencias por producto o por variante sin entrar al formulario completo.
          </p>
        </div>
        <form onSubmit={handleSearchSubmit} className="flex w-full max-w-md gap-2">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Buscar producto, variante o categoría"
          />
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={`rounded-lg border p-4 text-left transition ${
            filter === "ALL" ? "border-primary-500 bg-primary-50" : "hover:bg-muted/50"
          }`}
        >
          <p className="text-sm font-medium">Todos</p>
          <p className="text-2xl font-semibold">{stockSummary.total}</p>
          <p className="text-muted-foreground text-xs">Productos y variantes listados</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter("TRACKED")}
          className={`rounded-lg border p-4 text-left transition ${
            filter === "TRACKED" ? "border-primary-500 bg-primary-50" : "hover:bg-muted/50"
          }`}
        >
          <p className="text-sm font-medium">Con control</p>
          <p className="text-2xl font-semibold">{stockSummary.tracked}</p>
          <p className="text-muted-foreground text-xs">Líneas con stock administrado</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter("LOW")}
          className={`rounded-lg border p-4 text-left transition ${
            filter === "LOW" ? "border-warning-500 bg-warning-50" : "hover:bg-muted/50"
          }`}
        >
          <p className="text-sm font-medium">Stock bajo</p>
          <p className="text-2xl font-semibold">{stockSummary.low}</p>
          <p className="text-muted-foreground text-xs">Entre 1 y 5 unidades</p>
        </button>
        <button
          type="button"
          onClick={() => setFilter("SOLD_OUT")}
          className={`rounded-lg border p-4 text-left transition ${
            filter === "SOLD_OUT" ? "border-warning-500 bg-warning-50" : "hover:bg-muted/50"
          }`}
        >
          <p className="text-sm font-medium">Agotados</p>
          <p className="text-2xl font-semibold">{stockSummary.soldOut}</p>
          <p className="text-muted-foreground text-xs">Listos para reposición</p>
        </button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Variante</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Acción</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                Cargando stock...
              </TableCell>
            </TableRow>
          ) : filteredRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                No hay resultados para los filtros actuales.
              </TableCell>
            </TableRow>
          ) : (
            filteredRows.map((row) => {
              const badge = getStockBadge(row);
              return (
                <TableRow key={row.rowId}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">{row.productName}</p>
                      <p className="text-muted-foreground text-xs">{row.productSlug}</p>
                    </div>
                  </TableCell>
                  <TableCell>{row.variantName ?? "-"}</TableCell>
                  <TableCell>{row.categoryName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {!row.productIsActive ? (
                        <Badge variant="outline">Producto inactivo</Badge>
                      ) : null}
                      {row.variantName && row.variantIsActive === false ? (
                        <Badge variant="outline">Variante inactiva</Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyDelta(row, -1)}
                        disabled={savingRowId === row.rowId}
                      >
                        -1
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        value={drafts[row.rowId] ?? String(row.stockQuantity)}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.rowId]: event.target.value,
                          }))
                        }
                        className="w-28"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyDelta(row, 1)}
                        disabled={savingRowId === row.rowId}
                      >
                        +1
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingRowId === row.rowId}
                      onClick={() => void updateRowStock(row)}
                    >
                      {savingRowId === row.rowId ? "Guardando..." : "Guardar"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </section>
  );
}
