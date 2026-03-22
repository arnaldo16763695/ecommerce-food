"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ExchangeRateItem = {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  source: string | null;
  isActive: boolean;
  effectiveAt: string;
  updatedAt: string;
};

type ExchangeRateResponse = {
  data: ExchangeRateItem[];
};

export default function ExchangeRatesTable() {
  const { toast } = useToast();
  const [rates, setRates] = useState<ExchangeRateItem[]>([]);
  const [rateInput, setRateInput] = useState("");
  const [sourceInput, setSourceInput] = useState("BCV");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRate = useMemo(
    () => rates.find((item) => item.isActive) ?? null,
    [rates],
  );

  const loadRates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/exchange-rates", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudieron cargar las tasas");
      }

      const payload = (await res.json()) as ExchangeRateResponse;
      setRates(payload.data ?? []);
      if (payload.data?.length) {
        const currentActive = payload.data.find((item) => item.isActive);
        if (currentActive) {
          setRateInput(String(currentActive.rate));
          setSourceInput(currentActive.source ?? "BCV");
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al cargar tasas";
      setError(message);
      toast({
        title: "Error al cargar tasas",
        description: message,
        variant: "destructive",
      });
      setRates([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadRates();
  }, [loadRates]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const normalizedRate = Number(rateInput.trim().replace(",", "."));
      if (!Number.isFinite(normalizedRate) || normalizedRate <= 0) {
        throw new Error("La tasa debe ser un numero mayor que cero.");
      }

      const res = await fetch("/api/admin/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rate: normalizedRate,
          source: sourceInput.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo guardar la tasa");
      }

      toast({
        title: "Tasa actualizada",
        description: "La nueva tasa activa se guardo correctamente.",
      });
      await loadRates();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado al guardar tasa";
      setError(message);
      toast({
        title: "No se pudo guardar la tasa",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border p-4">
        <h2 className="text-lg font-semibold">USD a VES (BCV)</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Define la tasa activa para mostrar equivalencia en bolivares.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <label htmlFor="rate" className="text-sm font-medium">
              Tasa (1 USD = ? VES)
            </label>
            <Input
              id="rate"
              type="text"
              inputMode="decimal"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              placeholder="Ejemplo: 89.45"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="source" className="text-sm font-medium">
              Fuente
            </label>
            <Input
              id="source"
              value={sourceInput}
              onChange={(e) => setSourceInput(e.target.value)}
              placeholder="BCV"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Guardando..." : "Guardar tasa"}
            </Button>
          </div>
        </form>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-lg border p-4">
        <h3 className="text-base font-semibold">Historial reciente</h3>
        {activeRate ? (
          <p className="text-muted-foreground mt-1 text-sm">
            Tasa activa: {activeRate.rate.toFixed(4)} VES por USD
          </p>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">
            Aun no hay una tasa activa configurada.
          </p>
        )}

        <Table className="mt-3">
          <TableHeader>
            <TableRow>
              <TableHead>Tasa</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vigencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  Cargando tasas...
                </TableCell>
              </TableRow>
            ) : rates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  No hay registros de tasa.
                </TableCell>
              </TableRow>
            ) : (
              rates.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.rate.toFixed(4)}</TableCell>
                  <TableCell>{item.source ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "success" : "warning"}>
                      {item.isActive ? "Activa" : "Historica"}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(item.effectiveAt).toLocaleString("es-VE")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
