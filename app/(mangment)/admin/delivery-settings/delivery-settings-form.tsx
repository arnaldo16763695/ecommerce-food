"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrencyFromCents } from "@/lib/money";

type DeliverySettingsResponse = {
  data: {
    deliveryFeeCents: number;
    freeDeliveryMinCents: number;
  };
};

function parseAmountToCents(value: string) {
  const normalized = value.trim().replace(",", ".");
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100);
}

function centsToInputValue(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function DeliverySettingsForm() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deliveryFeeInput, setDeliveryFeeInput] = useState("");
  const [freeDeliveryMinInput, setFreeDeliveryMinInput] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/delivery-settings", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo cargar la configuracion.");
      }

      const payload = (await res.json()) as DeliverySettingsResponse;
      setDeliveryFeeInput(centsToInputValue(payload.data.deliveryFeeCents));
      setFreeDeliveryMinInput(centsToInputValue(payload.data.freeDeliveryMinCents));
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error inesperado al cargar configuracion.";
      setError(message);
      toast({
        title: "Error al cargar configuracion",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const deliveryFeeCents = parseAmountToCents(deliveryFeeInput);
      const freeDeliveryMinCents = parseAmountToCents(freeDeliveryMinInput);

      if (deliveryFeeCents === null) {
        throw new Error("El costo de delivery debe ser un numero valido.");
      }
      if (freeDeliveryMinCents === null) {
        throw new Error(
          "El minimo para delivery gratis debe ser un numero valido.",
        );
      }

      const res = await fetch("/api/admin/delivery-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryFeeCents,
          freeDeliveryMinCents,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "No se pudo guardar la configuracion.");
      }

      toast({
        title: "Configuracion guardada",
        description: "Las reglas de delivery se actualizaron correctamente.",
      });
      await loadSettings();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error inesperado al guardar configuracion.";
      setError(message);
      toast({
        title: "No se pudo guardar",
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
        <h2 className="text-lg font-semibold">Reglas de delivery</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Define el costo de delivery y el monto minimo para obtener delivery
          gratis.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="delivery-fee" className="text-sm font-medium">
              Costo delivery (USD)
            </label>
            <Input
              id="delivery-fee"
              type="text"
              inputMode="decimal"
              placeholder="Ej: 10.00"
              value={deliveryFeeInput}
              onChange={(event) => setDeliveryFeeInput(event.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="free-min" className="text-sm font-medium">
              Minimo para delivery gratis (USD)
            </label>
            <Input
              id="free-min"
              type="text"
              inputMode="decimal"
              placeholder="Ej: 100.00"
              value={freeDeliveryMinInput}
              onChange={(event) => setFreeDeliveryMinInput(event.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="flex items-end">
            <Button type="submit" disabled={loading || saving} className="w-full">
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading ? (
        <div className="rounded-lg border p-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Costo actual:{" "}
            <strong>{formatCurrencyFromCents(parseAmountToCents(deliveryFeeInput) ?? 0, "USD", "en-US")}</strong>
          </p>
          <p>
            Minimo gratis:{" "}
            <strong>
              {formatCurrencyFromCents(parseAmountToCents(freeDeliveryMinInput) ?? 0, "USD", "en-US")}
            </strong>
          </p>
        </div>
      ) : null}
    </section>
  );
}
