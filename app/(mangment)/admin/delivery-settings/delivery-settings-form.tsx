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
    operatingHoursConfigured: boolean;
    isAcceptingOrdersNow: boolean;
    availabilityReason: string | null;
    operatingHours: Array<{
      dayOfWeek: number;
      opensAt: string;
      closesAt: string;
      isEnabled: boolean;
    }>;
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

const DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sabado",
};

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
  const [operatingHoursConfigured, setOperatingHoursConfigured] = useState(false);
  const [isAcceptingOrdersNow, setIsAcceptingOrdersNow] = useState(false);
  const [availabilityReason, setAvailabilityReason] = useState<string | null>(null);
  const [operatingHours, setOperatingHours] = useState<
    DeliverySettingsResponse["data"]["operatingHours"]
  >([]);
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
      setOperatingHoursConfigured(payload.data.operatingHoursConfigured);
      setIsAcceptingOrdersNow(payload.data.isAcceptingOrdersNow);
      setAvailabilityReason(payload.data.availabilityReason);
      setOperatingHours(payload.data.operatingHours);
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
          operatingHours,
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

  function updateOperatingHour(
    dayOfWeek: number,
    patch: Partial<DeliverySettingsResponse["data"]["operatingHours"][number]>,
  ) {
    setOperatingHours((current) =>
      current.map((hour) =>
        hour.dayOfWeek === dayOfWeek ? { ...hour, ...patch } : hour,
      ),
    );
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
                <p className={`mt-1 font-semibold ${isAcceptingOrdersNow ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
                  {isAcceptingOrdersNow ? "Abierta para pedidos" : "No disponible para pedidos"}
                </p>
                {availabilityReason ? (
                  <p className="mt-1 text-xs text-slate-500">{availabilityReason}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-base font-semibold">Horario de operacion</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  La tienda solo acepta pedidos dentro del horario configurado. Si dejas la tienda abierta, deberas volver a abrirla manualmente cada nuevo dia.
                </p>
              </div>
              <div className="rounded-md border px-3 py-2 text-xs text-slate-500">
                {operatingHoursConfigured
                  ? "Horario automatico activo"
                  : "Aun no has guardado un horario; se mantiene la regla manual actual."}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {operatingHours.map((hour) => (
                <div
                  key={hour.dayOfWeek}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-[140px_120px_120px_1fr]"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{DAY_LABELS[hour.dayOfWeek]}</p>
                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={hour.isEnabled}
                        onChange={(event) =>
                          updateOperatingHour(hour.dayOfWeek, {
                            isEnabled: event.target.checked,
                          })
                        }
                        disabled={loading}
                      />
                      Habilitado
                    </label>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Abre</label>
                    <Input
                      type="time"
                      value={hour.opensAt}
                      onChange={(event) =>
                        updateOperatingHour(hour.dayOfWeek, {
                          opensAt: event.target.value,
                        })
                      }
                      disabled={loading || !hour.isEnabled}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium">Cierra</label>
                    <Input
                      type="time"
                      value={hour.closesAt}
                      onChange={(event) =>
                        updateOperatingHour(hour.dayOfWeek, {
                          closesAt: event.target.value,
                        })
                      }
                      disabled={loading || !hour.isEnabled}
                    />
                  </div>

                  <div className="rounded-md border px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
                    {hour.isEnabled
                      ? `Recibira pedidos entre ${hour.opensAt} y ${hour.closesAt}.`
                      : "No recibira pedidos este dia."}
                  </div>
                </div>
              ))}
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
            <strong>{isAcceptingOrdersNow ? "Abierta para pedidos" : "No disponible para pedidos"}</strong>
          </p>
          <p>
            Horario automatico:{" "}
            <strong>{operatingHoursConfigured ? "Configurado" : "Pendiente por configurar"}</strong>
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
