"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

type Props = {
  orderId: string;
  orderNumber: number;
  paymentMethod: "MOBILE_PAYMENT" | "BANK_TRANSFER" | "IN_STORE" | null;
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
  paymentReviewStatus: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
  paymentReference: string | null;
  paymentProofUrl: string | null;
  initialReviewNote: string | null;
};

export default function PaymentReviewPanel({
  orderId,
  orderNumber,
  paymentMethod,
  paymentStatus,
  paymentReviewStatus,
  paymentReference,
  paymentProofUrl,
  initialReviewNote,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [reviewNote, setReviewNote] = useState(initialReviewNote ?? "");
  const [saving, setSaving] = useState(false);

  const needsManualReview =
    paymentMethod !== null &&
    paymentMethod !== "IN_STORE" &&
    Boolean(paymentProofUrl || paymentReference);

  async function submitReview(action: "APPROVE_PAYMENT" | "REJECT_PAYMENT_REVIEW") {
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          reviewNote: reviewNote.trim() || undefined,
        }),
      });

      const body = (await res.json().catch(() => null)) as
        | { error?: string; data?: { orderNumber?: number } }
        | null;

      if (!res.ok) {
        throw new Error(body?.error ?? "No se pudo procesar la revision del pago.");
      }

      toast({
        title:
          action === "APPROVE_PAYMENT"
            ? "Pago aprobado"
            : "Revision rechazada",
        description: `Pedido #${body?.data?.orderNumber ?? orderNumber} actualizado.`,
      });
      router.refresh();
    } catch (error) {
      toast({
        title: "No se pudo actualizar la revision",
        description:
          error instanceof Error
            ? error.message
            : "Error inesperado al revisar el pago.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!needsManualReview) {
    return (
      <div className="rounded-lg border p-4">
        <h3 className="mb-2 text-base font-semibold">Revision manual</h3>
        <p className="text-sm text-slate-600">
          Este pedido no requiere revision manual o no tiene soporte de pago para validar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 text-base font-semibold">Revision manual del pago</h3>
      <p className="mb-3 text-sm text-slate-600">
        Estado actual: <strong>{paymentReviewStatus}</strong> · Pago:{" "}
        <strong>{paymentStatus}</strong>
      </p>

      <label className="mb-1 block text-sm font-medium">Nota de revision</label>
      <textarea
        value={reviewNote}
        onChange={(event) => setReviewNote(event.target.value)}
        rows={4}
        className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        placeholder="Opcional: observaciones de la aprobacion o rechazo."
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={saving}
          onClick={() => void submitReview("APPROVE_PAYMENT")}
        >
          {saving ? "Guardando..." : "Aprobar pago"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={() => void submitReview("REJECT_PAYMENT_REVIEW")}
        >
          {saving ? "Guardando..." : "Rechazar comprobante"}
        </Button>
      </div>
    </div>
  );
}
