"use client";
import {
  RiAddLine,
  RiArrowRightLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiEdit2Line,
  RiInformationLine,
  RiLock2Line,
  RiSubtractLine,
} from "@remixicon/react";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { useEffect, useMemo, useState } from "react";
import { AllProducts } from "@/lib/data/productsData";
import type { CartItemOption } from "@/types/types";
import { buildCartLineKey } from "@/lib/cart-line-key";
import { resolveProductImageSrc } from "@/lib/product-image";
import {
  convertUsdCentsToVesCents,
  formatCurrencyFromCents,
} from "@/lib/money";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  products: AllProducts[];
  usdToVesRate: number | null;
  deliveryFeeCents: number;
  freeDeliveryMinCents: number;
};

type CustomizationGroup = NonNullable<AllProducts["optionGroups"]>[number]["group"];

type DisplayCartItem = {
  lineKey: string;
  productId: string;
  name: string;
  basePriceCents: number;
  price: number;
  quantity: number;
  notes: string | undefined;
  options: CartItemOption[];
  image: string;
  customizationGroups: CustomizationGroup[];
};

function CartItems({
  products,
  usdToVesRate,
  deliveryFeeCents,
  freeDeliveryMinCents,
}: Props) {
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const updateItemConfiguration = useCartStore(
    (state) => state.updateItemConfiguration,
  );
  const clearCart = useCartStore((state) => state.clearCart);
  const hydrateFromServer = useCartStore((state) => state.hydrateFromServer);
  const isHydratedFromServer = useCartStore((state) => state.isHydratedFromServer);

  const [editingLineKey, setEditingLineKey] = useState<string | null>(null);
  const [draftNotes, setDraftNotes] = useState("");
  const [draftSelectedByGroup, setDraftSelectedByGroup] = useState<
    Record<string, string[]>
  >({});
  const [attemptedSave, setAttemptedSave] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<
    { type: "remove"; item: DisplayCartItem } | { type: "clear" } | null
  >(null);

  useEffect(() => {
    if (!isHydratedFromServer) {
      void hydrateFromServer();
    }
  }, [hydrateFromServer, isHydratedFromServer]);

  const cartItems = useMemo(() => {
    return items
      .map((item) => {
        const productId = item.productId ?? item.id;
        const product = products.find((p) => p.id === productId);
        if (!product) return null;

        const customizationGroups = (product.optionGroups ?? [])
          .map((relation) => relation.group)
          .filter((group) => group.isActive && group.options.length > 0);

        return {
          lineKey: item.id,
          productId,
          name: product.name,
          basePriceCents: product.basePriceCents,
          price: item.unitPriceCents ?? product.basePriceCents,
          quantity: item.quantity,
          notes: item.notes ?? undefined,
          options: item.options ?? [],
          image: resolveProductImageSrc(product.images[0]?.url),
          customizationGroups,
        } satisfies DisplayCartItem;
      })
      .filter((item): item is DisplayCartItem => item !== null);
  }, [items, products]);

  const editingItem = useMemo(
    () => cartItems.find((item) => item.lineKey === editingLineKey) ?? null,
    [cartItems, editingLineKey],
  );

  const startEditing = (item: DisplayCartItem) => {
    const byGroup: Record<string, string[]> = {};
    for (const group of item.customizationGroups) {
      const selectedOptionIds = item.options
        .map((opt) => opt.optionId)
        .filter((optionId) =>
          group.options.some((option) => option.id === optionId),
        );
      byGroup[group.id] = selectedOptionIds;
    }

    setDraftSelectedByGroup(byGroup);
    setDraftNotes(item.notes ?? "");
    setAttemptedSave(false);
    setEditingLineKey(item.lineKey);
  };

  const draftSelectedOptions = useMemo(() => {
    if (!editingItem) return [];

    return editingItem.customizationGroups.flatMap((group) => {
      const selectedIds = draftSelectedByGroup[group.id] ?? [];
      return group.options.filter((option) => selectedIds.includes(option.id));
    });
  }, [editingItem, draftSelectedByGroup]);

  const draftOptionSnapshots = useMemo(() => {
    if (!editingItem) return [];

    return editingItem.customizationGroups.flatMap((group) => {
      const selectedIds = draftSelectedByGroup[group.id] ?? [];
      return group.options
        .filter((option) => selectedIds.includes(option.id))
        .map((option) => ({
          optionId: option.id,
          groupName: group.name,
          optionName: option.name,
          priceDeltaCents: option.priceDeltaCents,
        }));
    });
  }, [editingItem, draftSelectedByGroup]);

  const draftOptionDelta = draftSelectedOptions.reduce(
    (sum, option) => sum + option.priceDeltaCents,
    0,
  );
  const draftUnitPriceCents = editingItem
    ? editingItem.basePriceCents + draftOptionDelta
    : 0;

  const draftGroupErrors = useMemo(() => {
    if (!editingItem) return {};

    return editingItem.customizationGroups.reduce<Record<string, string>>(
      (acc, group) => {
        const selectedCount = draftSelectedByGroup[group.id]?.length ?? 0;
        if (selectedCount < group.minSelect) {
          acc[group.id] = `Elige al menos ${group.minSelect}.`;
        } else if (selectedCount > group.maxSelect) {
          acc[group.id] = `Elige hasta ${group.maxSelect}.`;
        }
        return acc;
      },
      {},
    );
  }, [editingItem, draftSelectedByGroup]);

  const canSaveEdit = Object.keys(draftGroupErrors).length === 0;

  const totalItems = useMemo(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  const subTotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cartItems]);

  const tax = Math.round(subTotal * 0.1);
  const shipping =
    subTotal === 0 ? 0 : subTotal >= freeDeliveryMinCents ? 0 : deliveryFeeCents;
  const totalCents = subTotal + tax + shipping;

  const formatUsd = (cents: number) => formatCurrencyFromCents(cents, "USD", "en-US");
  const formatVes = (cents: number) =>
    usdToVesRate
      ? formatCurrencyFromCents(
          convertUsdCentsToVesCents(cents, usdToVesRate),
          "VES",
          "es-VE",
        )
      : null;

  const handleToggleDraftOption = (group: CustomizationGroup, optionId: string) => {
    setDraftSelectedByGroup((prev) => {
      const current = prev[group.id] ?? [];
      const exists = current.includes(optionId);

      if (group.maxSelect === 1) {
        return {
          ...prev,
          [group.id]: exists ? [] : [optionId],
        };
      }

      if (exists) {
        return {
          ...prev,
          [group.id]: current.filter((id) => id !== optionId),
        };
      }

      if (current.length >= group.maxSelect) {
        return prev;
      }

      return {
        ...prev,
        [group.id]: [...current, optionId],
      };
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    setAttemptedSave(true);
    if (!canSaveEdit) return;

    const normalizedNotes = draftNotes.trim();
    const nextLineKey = buildCartLineKey({
      productId: editingItem.productId,
      optionIds: draftOptionSnapshots.map((option) => option.optionId),
      notes: normalizedNotes,
    });

    updateItemConfiguration(editingItem.lineKey, {
      lineKey: nextLineKey,
      unitPriceCents: draftUnitPriceCents,
      notes: normalizedNotes || undefined,
      options: draftOptionSnapshots,
    });
    setEditingLineKey(null);
  };

  const openRemoveConfirmation = (item: DisplayCartItem) => {
    setConfirmState({ type: "remove", item });
    setConfirmDialogOpen(true);
  };

  const openClearCartConfirmation = () => {
    setConfirmState({ type: "clear" });
    setConfirmDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!confirmState) return;

    if (confirmState.type === "remove") {
      removeItem(confirmState.item.lineKey);
    } else {
      clearCart();
    }

    setConfirmDialogOpen(false);
    setConfirmState(null);
  };

  return (
    <section className="bg-neutral-50 py-10 dark:bg-slate-900 md:py-16">
      <div className="page-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <h3 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-slate-100">
              Bolsa de compras
            </h3>
            <p className="text-sm text-neutral-600 dark:text-slate-300">
              ({totalItems}) {totalItems > 1 ? "articulos" : "articulo"} listos para finalizar compra
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <div className="space-y-4 lg:col-span-2">
            {cartItems.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center space-y-3">
                <p className="text-neutral-600 dark:text-slate-800 font-cunia text-lg">
                  Tu carrito esta vacio
                </p>
                <Link href="/shop" className="btn-primary">
                  Seguir comprando
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30">
                <div className="divide-y divide-neutral-200 dark:divide-slate-700 md:hidden">
                  {cartItems.map((item) => (
                    <article key={item.lineKey} className="space-y-4 p-4">
                      <div className="flex gap-4">
                        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2 dark:border-slate-600 dark:bg-slate-700/60">
                          <Image
                            src={item.image}
                            width={80}
                            height={80}
                            alt={item.name}
                            className="h-auto w-auto object-contain"
                          />
                        </div>

                        <div className="flex-1">
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-medium leading-tight text-neutral-900 dark:text-slate-100">
                                {item.name}
                              </h3>
                              {item.options.length > 0 && (
                                <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400">
                                  {item.options.map((opt) => opt.optionName).join(", ")}
                                </p>
                              )}
                              {item.notes && (
                                <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400">
                                  Nota: {item.notes}
                                </p>
                              )}
                              <button
                                onClick={() => startEditing(item)}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline dark:text-primary-300"
                              >
                                <RiEdit2Line size={14} />
                                Editar producto
                              </button>
                            </div>
                            <button
                              onClick={() => openRemoveConfirmation(item)}
                              title="Eliminar producto"
                              aria-label={`Eliminar ${item.name}`}
                              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:hover:bg-red-400/10 dark:hover:text-red-300 dark:focus:bg-red-400/10 dark:focus:text-red-300"
                            >
                              <RiDeleteBin6Line size={18} />
                            </button>
                          </div>

                          <p className="mb-3 text-sm text-neutral-600 dark:text-slate-300">
                            {formatUsd(item.price)} cada uno
                          </p>

                          <div className="inline-flex items-center rounded-xl border border-neutral-300 bg-white dark:border-slate-600 dark:bg-slate-900">
                            <button
                              aria-label={`Disminuir cantidad de ${item.name}`}
                              className="rounded-l-xl p-2 transition hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                              onClick={() =>
                                updateQuantity(item.lineKey, item.quantity - 1)
                              }
                            >
                              <RiSubtractLine size={18} />
                            </button>
                            <p className="min-w-10 px-3 py-2 text-center font-medium text-neutral-800 dark:text-slate-100">
                              {item.quantity}
                            </p>
                            <button
                              aria-label={`Aumentar cantidad de ${item.name}`}
                              className="rounded-r-xl p-2 transition hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                              onClick={() =>
                                updateQuantity(item.lineKey, item.quantity + 1)
                              }
                            >
                              <RiAddLine size={18} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700/60">
                        <p className="text-sm font-medium text-neutral-600 dark:text-slate-300">
                          Subtotal
                        </p>
                        <p className="font-semibold text-primary-600">
                          {formatUsd(item.price * item.quantity)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-hidden md:block">
                  <table className="min-w-full border-collapse text-left">
                    <thead className="border-b border-neutral-200 bg-neutral-50 text-sm dark:border-slate-700 dark:bg-slate-700/60">
                      <tr>
                        {["Producto", "Precio", "Cantidad", "Total"].map((label) => (
                          <th
                            className="p-4 font-semibold uppercase tracking-wide text-neutral-500 dark:text-slate-300"
                            key={label}
                          >
                            {label}
                          </th>
                        ))}
                        <th className="p-4"></th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-neutral-200 dark:divide-slate-700">
                      {cartItems.map((item) => (
                        <tr
                          key={item.lineKey}
                          className="transition-colors hover:bg-neutral-50 dark:hover:bg-slate-700/40"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2 dark:border-slate-600 dark:bg-slate-700/60">
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  width={52}
                                  height={80}
                                  className="h-auto w-auto object-contain"
                                />
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900 dark:text-slate-100">
                                  {item.name}
                                </p>
                                {item.options.length > 0 && (
                                  <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400">
                                    {item.options.map((opt) => opt.optionName).join(", ")}
                                  </p>
                                )}
                                {item.notes && (
                                  <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400">
                                    Nota: {item.notes}
                                  </p>
                                )}
                                <button
                                  onClick={() => startEditing(item)}
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline dark:text-primary-300"
                                >
                                  <RiEdit2Line size={14} />
                                  Editar producto
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-neutral-700 dark:text-slate-300">
                            {formatUsd(item.price)}
                          </td>
                          <td className="p-4">
                            <div className="inline-flex items-center rounded-xl border border-neutral-300 bg-white dark:border-slate-600 dark:bg-slate-900">
                              <button
                                aria-label={`Disminuir cantidad de ${item.name}`}
                                className="rounded-l-xl p-2 transition hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                                onClick={() =>
                                  updateQuantity(item.lineKey, item.quantity - 1)
                                }
                              >
                                <RiSubtractLine size={18} />
                              </button>
                              <p className="min-w-10 px-3 py-2 text-center font-medium text-neutral-800 dark:text-slate-100">
                                {item.quantity}
                              </p>
                              <button
                                aria-label={`Aumentar cantidad de ${item.name}`}
                                className="rounded-r-xl p-2 transition hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                                onClick={() =>
                                  updateQuantity(item.lineKey, item.quantity + 1)
                                }
                              >
                                <RiAddLine size={18} />
                              </button>
                            </div>
                          </td>
                          <td className="p-4 font-semibold text-neutral-900 dark:text-slate-100">
                            {formatUsd(item.price * item.quantity)}
                          </td>
                          <td className="p-4">
                            <button
                              title="Eliminar producto"
                              aria-label={`Eliminar ${item.name}`}
                              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:hover:bg-red-400/10 dark:hover:text-red-300 dark:focus:bg-red-400/10 dark:focus:text-red-300"
                              onClick={() => openRemoveConfirmation(item)}
                            >
                              <RiDeleteBin6Line size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {cartItems.length > 0 && (
              <button
                className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 focus:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/20 dark:focus:bg-red-400/20"
                onClick={openClearCartConfirmation}
              >
                <RiDeleteBin6Line size={16} />
                Vaciar carrito
              </button>
            )}
          </div>

          {cartItems.length > 0 && (
            <aside className="sticky top-24 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30 lg:col-span-1">
              <h3 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-slate-100">
                Resumen del pedido
              </h3>

              <div className="mb-5 space-y-3 text-sm">
                <div className="flex justify-between text-neutral-600 dark:text-slate-300">
                  <h4>Subtotal</h4>
                  <div className="text-right">
                    <p>{formatUsd(subTotal)}</p>
                    {formatVes(subTotal) ? (
                      <p className="text-xs text-neutral-500 dark:text-slate-400">
                        {formatVes(subTotal)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-slate-300">
                  <h4>Envio</h4>
                  <p className="font-medium text-emerald-600 dark:text-emerald-400">
                    {shipping === 0 ? "Gratis" : formatUsd(shipping)}
                  </p>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-slate-300">
                  <h4>Impuestos</h4>
                  <div className="text-right">
                    <p>{formatUsd(tax)}</p>
                    {formatVes(tax) ? (
                      <p className="text-xs text-neutral-500 dark:text-slate-400">
                        {formatVes(tax)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-slate-600 dark:bg-slate-700/60">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-semibold text-neutral-800 dark:text-slate-100">Total</h4>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-neutral-900 dark:text-slate-100">
                      {formatUsd(totalCents)}
                    </p>
                    {formatVes(totalCents) ? (
                      <p className="text-xs text-neutral-500 dark:text-slate-400">
                        {formatVes(totalCents)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <p className="text-xs text-neutral-500 dark:text-slate-400">
                  Incluye todos los impuestos y cargos.
                </p>
              </div>

              <Link
                href="/checkout"
                className="btn-primary inline-flex w-full items-center justify-center gap-2"
              >
                <RiLock2Line size={16} />
                Finalizar compra segura
              </Link>

              <p className="mt-3 flex items-start gap-2 text-xs text-neutral-500 dark:text-slate-400">
                <RiInformationLine size={16} className="mt-0.5" />
                Aun puedes ajustar cantidades antes del pago final.
              </p>

              <Link
                href="/shop"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 transition hover:underline focus:underline dark:text-primary-400"
              >
                Seguir comprando
                <RiArrowRightLine size={16} />
              </Link>
            </aside>
          )}
        </div>
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-90 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Editar {editingItem.name}
              </h3>
              <button
                onClick={() => setEditingLineKey(null)}
                className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Cerrar dialogo de edicion"
              >
                <RiCloseLine size={20} />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
              {editingItem.customizationGroups.length > 0 ? (
                editingItem.customizationGroups.map((group) => {
                  const selectedCount = draftSelectedByGroup[group.id]?.length ?? 0;
                  const isSingleChoice = group.maxSelect === 1;
                  return (
                    <div key={group.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          {group.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {group.minSelect > 0
                            ? `Requerido ${group.minSelect}-${group.maxSelect}`
                            : `Opcional hasta ${group.maxSelect}`}{" "}
                          ({selectedCount}/{group.maxSelect})
                        </p>
                      </div>
                      <div className="grid gap-2">
                        {group.options.map((option) => {
                          const isSelected =
                            draftSelectedByGroup[group.id]?.includes(option.id) ??
                            false;
                          const isDisabled =
                            !isSelected &&
                            !isSingleChoice &&
                            selectedCount >= group.maxSelect;

                          return (
                            <label
                              key={option.id}
                              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                                isSelected
                                  ? "border-primary-400 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10"
                                  : "border-slate-200 dark:border-slate-600"
                              } ${isDisabled ? "opacity-60" : ""}`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type={isSingleChoice ? "radio" : "checkbox"}
                                  name={group.id}
                                  checked={isSelected}
                                  disabled={isDisabled}
                                  onChange={() =>
                                    handleToggleDraftOption(group, option.id)
                                  }
                                />
                                <span className="text-sm text-slate-800 dark:text-slate-100">
                                  {option.name}
                                </span>
                              </div>
                              <span className="text-sm text-primary-700 dark:text-primary-300">
                                {option.priceDeltaCents > 0
                                  ? `+${formatUsd(option.priceDeltaCents)}`
                                  : "Incluido"}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      {attemptedSave && draftGroupErrors[group.id] && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {draftGroupErrors[group.id]}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600 dark:border-slate-600 dark:text-slate-300">
                  Este producto no tiene opciones configurables.
                </p>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="edit-item-notes"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Notas (opcional)
                </label>
                <textarea
                  id="edit-item-notes"
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  rows={3}
                  maxLength={180}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Nuevo precio: {formatUsd(draftUnitPriceCents)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingLineKey(null)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
                >
                  Cancelar
                </button>
                <button onClick={handleSaveEdit} className="btn-primary text-sm">
                  Guardar cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          setConfirmDialogOpen(open);
          if (!open) {
            setConfirmState(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {confirmState?.type === "remove"
                ? "Eliminar producto"
                : "Vaciar carrito"}
            </DialogTitle>
            <DialogDescription>
              {confirmState?.type === "remove"
                ? `Se eliminara "${confirmState.item.name}" del carrito. Esta accion no se puede deshacer.`
                : "Se eliminaran todos los productos del carrito. Esta accion no se puede deshacer."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmAction}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

export default CartItems;




