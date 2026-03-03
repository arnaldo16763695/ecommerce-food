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

type Props = {
  products: AllProducts[];
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

function formatMoney(cents: number) {
  return (cents / 100).toFixed(2);
}

function CartItems({ products }: Props) {
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
          acc[group.id] = `Choose at least ${group.minSelect}.`;
        } else if (selectedCount > group.maxSelect) {
          acc[group.id] = `Choose up to ${group.maxSelect}.`;
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
  const shipping = subTotal === 0 ? 0 : subTotal >= 10000 ? 0 : 1000;
  const total = ((subTotal + tax + shipping) / 100).toFixed(2);

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

  return (
    <section className="bg-neutral-50 py-10 dark:bg-slate-900 md:py-16">
      <div className="page-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <h3 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-slate-100">
              Shopping cart
            </h3>
            <p className="text-sm text-neutral-600 dark:text-slate-300">
              ({totalItems}) {totalItems > 1 ? "items" : "item"} ready for checkout
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <div className="space-y-4 lg:col-span-2">
            {cartItems.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center space-y-3">
                <p className="text-neutral-600 dark:text-slate-800 font-cunia text-lg">
                  Your cart is empty
                </p>
                <Link href="/shop" className="btn-primary">
                  Continue shopping
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
                                  Note: {item.notes}
                                </p>
                              )}
                              <button
                                onClick={() => startEditing(item)}
                                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline dark:text-amber-300"
                              >
                                <RiEdit2Line size={14} />
                                Edit item
                              </button>
                            </div>
                            <button
                              onClick={() => removeItem(item.lineKey)}
                              title="Delete item"
                              aria-label={`Delete ${item.name}`}
                              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:hover:bg-red-400/10 dark:hover:text-red-300 dark:focus:bg-red-400/10 dark:focus:text-red-300"
                            >
                              <RiDeleteBin6Line size={18} />
                            </button>
                          </div>

                          <p className="mb-3 text-sm text-neutral-600 dark:text-slate-300">
                            ${formatMoney(item.price)} each
                          </p>

                          <div className="inline-flex items-center rounded-xl border border-neutral-300 bg-white dark:border-slate-600 dark:bg-slate-900">
                            <button
                              aria-label={`Decrease quantity for ${item.name}`}
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
                              aria-label={`Increase quantity for ${item.name}`}
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
                        <p className="font-semibold text-amber-600">
                          ${formatMoney(item.price * item.quantity)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-hidden md:block">
                  <table className="min-w-full border-collapse text-left">
                    <thead className="border-b border-neutral-200 bg-neutral-50 text-sm dark:border-slate-700 dark:bg-slate-700/60">
                      <tr>
                        {["Product", "Price", "Quantity", "Total"].map((label) => (
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
                                    Note: {item.notes}
                                  </p>
                                )}
                                <button
                                  onClick={() => startEditing(item)}
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline dark:text-amber-300"
                                >
                                  <RiEdit2Line size={14} />
                                  Edit item
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-neutral-700 dark:text-slate-300">
                            ${formatMoney(item.price)}
                          </td>
                          <td className="p-4">
                            <div className="inline-flex items-center rounded-xl border border-neutral-300 bg-white dark:border-slate-600 dark:bg-slate-900">
                              <button
                                aria-label={`Decrease quantity for ${item.name}`}
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
                                aria-label={`Increase quantity for ${item.name}`}
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
                            ${formatMoney(item.price * item.quantity)}
                          </td>
                          <td className="p-4">
                            <button
                              title="Delete item"
                              aria-label={`Delete ${item.name}`}
                              className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:hover:bg-red-400/10 dark:hover:text-red-300 dark:focus:bg-red-400/10 dark:focus:text-red-300"
                              onClick={() => removeItem(item.lineKey)}
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
                onClick={clearCart}
              >
                <RiDeleteBin6Line size={16} />
                Clear cart
              </button>
            )}
          </div>

          {cartItems.length > 0 && (
            <aside className="sticky top-24 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30 lg:col-span-1">
              <h3 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-slate-100">
                Order summary
              </h3>

              <div className="mb-5 space-y-3 text-sm">
                <div className="flex justify-between text-neutral-600 dark:text-slate-300">
                  <h4>Subtotal</h4>
                  <p>$ {formatMoney(subTotal)}</p>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-slate-300">
                  <h4>Shipping</h4>
                  <p className="font-medium text-emerald-600 dark:text-emerald-400">
                    {shipping === 0 ? "Free" : "$ " + formatMoney(shipping)}
                  </p>
                </div>
                <div className="flex justify-between text-neutral-600 dark:text-slate-300">
                  <h4>Tax</h4>
                  <p>${formatMoney(tax)}</p>
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-slate-600 dark:bg-slate-700/60">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="font-semibold text-neutral-800 dark:text-slate-100">Total</h4>
                  <p className="text-xl font-semibold text-neutral-900 dark:text-slate-100">${total}</p>
                </div>
                <p className="text-xs text-neutral-500 dark:text-slate-400">
                  Includes all taxes and fees.
                </p>
              </div>

              <button className="btn-primary inline-flex w-full items-center justify-center gap-2">
                <RiLock2Line size={16} />
                Check out securely
              </button>

              <p className="mt-3 flex items-start gap-2 text-xs text-neutral-500 dark:text-slate-400">
                <RiInformationLine size={16} className="mt-0.5" />
                You can still update quantities at checkout before final payment.
              </p>

              <Link
                href="/shop"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-600 transition hover:underline focus:underline dark:text-amber-400"
              >
                Continue shopping
                <RiArrowRightLine size={16} />
              </Link>
            </aside>
          )}
        </div>
      </div>

      {editingItem && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Edit {editingItem.name}
              </h3>
              <button
                onClick={() => setEditingLineKey(null)}
                className="rounded-md p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"
                aria-label="Close edit dialog"
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
                            ? `Required ${group.minSelect}-${group.maxSelect}`
                            : `Optional up to ${group.maxSelect}`}{" "}
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
                                  ? "border-amber-400 bg-amber-50 dark:border-amber-400 dark:bg-amber-400/10"
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
                              <span className="text-sm text-amber-700 dark:text-amber-300">
                                {option.priceDeltaCents > 0
                                  ? `+$${formatMoney(option.priceDeltaCents)}`
                                  : "Included"}
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
                  This product has no configurable options.
                </p>
              )}

              <div className="space-y-1">
                <label
                  htmlFor="edit-item-notes"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="edit-item-notes"
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  rows={3}
                  maxLength={180}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                New price: ${formatMoney(draftUnitPriceCents)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingLineKey(null)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600"
                >
                  Cancel
                </button>
                <button onClick={handleSaveEdit} className="btn-primary text-sm">
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default CartItems;
