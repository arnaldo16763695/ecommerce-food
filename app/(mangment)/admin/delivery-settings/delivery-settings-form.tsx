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
    isStoreOpen: boolean;
    storeStatusMessage: string;
    storeStatusChangedAt: string | null;
    paymentMobileBank: string;
    paymentMobilePhone: string;
    paymentMobileId: string;
    paymentTransferBank: string;
    paymentTransferAccountType: string;
    paymentTransferAccountNumber: string;
    paymentTransferId: string;
    paymentBeneficiaryName: string;
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
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [storeStatusMessage, setStoreStatusMessage] = useState("");
  const [storeStatusChangedAt, setStoreStatusChangedAt] = useState<string | null>(null);
  const [paymentMobileBank, setPaymentMobileBank] = useState("");
  const [paymentMobilePhone, setPaymentMobilePhone] = useState("");
  const [paymentMobileId, setPaymentMobileId] = useState("");
  const [paymentTransferBank, setPaymentTransferBank] = useState("");
  const [paymentTransferAccountType, setPaymentTransferAccountType] = useState("");
  const [paymentTransferAccountNumber, setPaymentTransferAccountNumber] = useState("");
  const [paymentTransferId, setPaymentTransferId] = useState("");
  const [paymentBeneficiaryName, setPaymentBeneficiaryName] = useState("");

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
      setIsStoreOpen(payload.data.isStoreOpen);
      setStoreStatusMessage(payload.data.storeStatusMessage);
      setStoreStatusChangedAt(payload.data.storeStatusChangedAt);
      setPaymentMobileBank(payload.data.paymentMobileBank);
      setPaymentMobilePhone(payload.data.paymentMobilePhone);
      setPaymentMobileId(payload.data.paymentMobileId);
      setPaymentTransferBank(payload.data.paymentTransferBank);
      setPaymentTransferAccountType(payload.data.paymentTransferAccountType);
      setPaymentTransferAccountNumber(payload.data.paymentTransferAccountNumber);
      setPaymentTransferId(payload.data.paymentTransferId);
      setPaymentBeneficiaryName(payload.data.paymentBeneficiaryName);
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
          isStoreOpen,
          storeStatusMessage: storeStatusMessage.trim(),
          paymentMobileBank: paymentMobileBank.trim(),
          paymentMobilePhone: paymentMobilePhone.trim(),
          paymentMobileId: paymentMobileId.trim(),
          paymentTransferBank: paymentTransferBank.trim(),
          paymentTransferAccountType: paymentTransferAccountType.trim(),
          paymentTransferAccountNumber: paymentTransferAccountNumber.trim(),
          paymentTransferId: paymentTransferId.trim(),
          paymentBeneficiaryName: paymentBeneficiaryName.trim(),
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
        description: "Los datos de la tienda se actualizaron correctamente.",
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
        <h2 className="text-lg font-semibold">Configuracion de la tienda</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Administra el estado operativo, el delivery y los datos bancarios del negocio para checkout.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-6">
          <div className="rounded-lg border p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Estado operativo</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  La tienda solo acepta pedidos cuando este estado esta abierto.
                </p>
                {storeStatusChangedAt ? (
                  <p className="text-xs text-slate-500">
                    Ultimo cambio: {new Date(storeStatusChangedAt).toLocaleString("es-VE")}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={isStoreOpen ? "default" : "outline"}
                  onClick={() => setIsStoreOpen(true)}
                  disabled={loading}
                >
                  Abrir tienda
                </Button>
                <Button
                  type="button"
                  variant={!isStoreOpen ? "destructive" : "outline"}
                  onClick={() => setIsStoreOpen(false)}
                  disabled={loading}
                >
                  Cerrar tienda
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-1">
                <label htmlFor="store-status-message" className="text-sm font-medium">
                  Mensaje para clientes cuando la tienda este cerrada
                </label>
                <Input
                  id="store-status-message"
                  value={storeStatusMessage}
                  onChange={(event) => setStoreStatusMessage(event.target.value)}
                  required
                  disabled={loading}
                  maxLength={250}
                />
              </div>
              <div className="rounded-md border px-3 py-2 text-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">Estado actual</p>
                <p className={`mt-1 font-semibold ${isStoreOpen ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                  {isStoreOpen ? "Abierta para pedidos" : "Cerrada para pedidos"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
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
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-base font-semibold">Pago movil</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Banco</label>
                <Input
                  value={paymentMobileBank}
                  onChange={(event) => setPaymentMobileBank(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Telefono</label>
                <Input
                  value={paymentMobilePhone}
                  onChange={(event) => setPaymentMobilePhone(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">Cedula o RIF</label>
                <Input
                  value={paymentMobileId}
                  onChange={(event) => setPaymentMobileId(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-base font-semibold">Transferencia bancaria</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Banco</label>
                <Input
                  value={paymentTransferBank}
                  onChange={(event) => setPaymentTransferBank(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo de cuenta</label>
                <Input
                  value={paymentTransferAccountType}
                  onChange={(event) => setPaymentTransferAccountType(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium">Numero de cuenta</label>
                <Input
                  value={paymentTransferAccountNumber}
                  onChange={(event) => setPaymentTransferAccountNumber(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Cedula o RIF</label>
                <Input
                  value={paymentTransferId}
                  onChange={(event) => setPaymentTransferId(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Beneficiario</label>
                <Input
                  value={paymentBeneficiaryName}
                  onChange={(event) => setPaymentBeneficiaryName(event.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading || saving}>
              {saving ? "Guardando..." : "Guardar configuracion"}
            </Button>
          </div>
        </form>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading ? (
        <div className="rounded-lg border p-4 text-sm text-slate-600 dark:text-slate-300">
          <p>
            Estado:{" "}
            <strong>{isStoreOpen ? "Abierta para pedidos" : "Cerrada para pedidos"}</strong>
          </p>
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
          <p>
            Pago movil: <strong>{paymentMobileBank}</strong> / {paymentMobilePhone}
          </p>
          <p>
            Transferencia: <strong>{paymentTransferBank}</strong> / {paymentTransferAccountNumber}
          </p>
        </div>
      ) : null}
    </section>
  );
}
