"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { RiAddLine, RiShoppingBag2Line, RiSubtractLine } from "@remixicon/react";

import { AllProducts } from "@/lib/data/productsData";
import { buildCartLineKey } from "@/lib/cart-line-key";
import { useCartStore } from "@/store/cartStore";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/use-toast";
import { resolveProductImageSrc } from "@/lib/product-image";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: AllProducts;
};

function formatMoney(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function QuickAddProductSheet({ open, onOpenChange, product }: Props) {
  const addToCart = useCartStore((state) => state.addItem);

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [attemptedAdd, setAttemptedAdd] = useState(false);

  const customizationGroups = useMemo(
    () =>
      product.optionGroups
        .map((relation) => relation.group)
        .filter((group) => group.isActive && group.options.length > 0),
    [product.optionGroups],
  );

  const selectedOptionsList = customizationGroups.flatMap((group) => {
    const selectedIds = selectedOptions[group.id] ?? [];
    return group.options.filter((option) => selectedIds.includes(option.id));
  });

  const selectedOptionSnapshots = customizationGroups.flatMap((group) => {
    const selectedIds = selectedOptions[group.id] ?? [];
    return group.options
      .filter((option) => selectedIds.includes(option.id))
      .map((option) => ({
        optionId: option.id,
        groupName: group.name,
        optionName: option.name,
        priceDeltaCents: option.priceDeltaCents,
      }));
  });

  const optionsDeltaCents = selectedOptionsList.reduce(
    (sum, option) => sum + option.priceDeltaCents,
    0,
  );

  const unitPriceCents = product.basePriceCents + optionsDeltaCents;
  const totalPriceCents = unitPriceCents * quantity;

  const groupErrors = customizationGroups.reduce<Record<string, string>>((acc, group) => {
    const selectedCount = selectedOptions[group.id]?.length ?? 0;

    if (selectedCount < group.minSelect) {
      acc[group.id] = `Elige al menos ${group.minSelect}.`;
    } else if (selectedCount > group.maxSelect) {
      acc[group.id] = `Elige hasta ${group.maxSelect}.`;
    }

    return acc;
  }, {});

  const canAddToCart = Object.keys(groupErrors).length === 0;

  const handleSelectOption = (groupId: string, optionId: string, maxSelect: number) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] ?? [];
      const exists = current.includes(optionId);

      if (maxSelect === 1) {
        return {
          ...prev,
          [groupId]: exists ? [] : [optionId],
        };
      }

      if (exists) {
        return {
          ...prev,
          [groupId]: current.filter((id) => id !== optionId),
        };
      }

      if (current.length >= maxSelect) {
        return prev;
      }

      return {
        ...prev,
        [groupId]: [...current, optionId],
      };
    });
  };

  const handleAddToCart = () => {
    setAttemptedAdd(true);
    if (!canAddToCart) return;

    const normalizedNotes = notes.trim();
    const lineKey = buildCartLineKey({
      productId: product.id,
      optionIds: selectedOptionSnapshots.map((option) => option.optionId),
      notes: normalizedNotes,
    });

    addToCart({
      productId: product.id,
      quantity,
      lineKey,
      unitPriceCents,
      notes: normalizedNotes || undefined,
      options: selectedOptionSnapshots,
    });

    toast({
      title: "Producto agregado",
      description: `${quantity} x ${product.name} agregado a tu orden.`,
    });

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="px-0 pb-4">
          <SheetTitle className="pl-3">Agregar al pedido</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-6 px-2">
          <div className="rounded-xl border border-primary-100 bg-primary-50 p-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-4 flex items-center justify-center rounded-lg bg-white p-3 dark:bg-slate-900">
              <Image
                src={resolveProductImageSrc(product.images[0]?.url)}
                alt={product.name}
                width={220}
                height={220}
                className="h-36 w-36 object-contain"
              />
            </div>
            <h3 className="text-xl text-slate-900 dark:text-slate-100">{product.name}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {product.description || "Preparado al momento con ingredientes de calidad."}
            </p>
            <p className="mt-2 font-semibold text-primary-600">${formatMoney(unitPriceCents)}</p>
          </div>

          {customizationGroups.length > 0 ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                Ingredientes y opciones
              </h4>

              {customizationGroups.map((group) => {
                const selectedCount = selectedOptions[group.id]?.length ?? 0;
                const isSingleChoice = group.maxSelect === 1;

                return (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{group.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {group.minSelect > 0
                          ? `Requerido (${group.minSelect}-${group.maxSelect})`
                          : `Opcional (máx ${group.maxSelect})`}{" "}
                        {selectedCount > 0 ? `· ${selectedCount} seleccionados` : ""}
                      </p>
                    </div>

                    <div className="grid gap-2">
                      {group.options.map((option) => {
                        const isSelected = selectedOptions[group.id]?.includes(option.id) ?? false;
                        const isDisabled =
                          !isSelected && !isSingleChoice && selectedCount >= group.maxSelect;

                        return (
                          <label
                            key={option.id}
                            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                              isSelected
                                ? "border-primary-400 bg-primary-50 dark:border-primary-300 dark:bg-primary-300/10"
                                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                            } ${isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type={isSingleChoice ? "radio" : "checkbox"}
                                name={group.id}
                                checked={isSelected}
                                disabled={isDisabled}
                                onChange={() => handleSelectOption(group.id, option.id, group.maxSelect)}
                              />
                              <span>{option.name}</span>
                            </div>
                            <span className="font-medium text-primary-700 dark:text-primary-300">
                              {option.priceDeltaCents > 0
                                ? `+$${formatMoney(option.priceDeltaCents)}`
                                : "Incluido"}
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    {attemptedAdd && groupErrors[group.id] && (
                      <p className="text-sm text-red-600 dark:text-red-400">{groupErrors[group.id]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor={`notes-${product.id}`} className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Notas (opcional)
            </label>
            <textarea
              id={`notes-${product.id}`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ej: sin cebolla, extra crujiente..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              rows={3}
              maxLength={180}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-300">Cantidad</p>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="rounded border border-slate-300 p-1.5 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  aria-label="Disminuir cantidad"
                >
                  <RiSubtractLine />
                </button>
                <span className="min-w-6 text-center text-sm font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => prev + 1)}
                  className="rounded border border-slate-300 p-1.5 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
                  aria-label="Aumentar cantidad"
                >
                  <RiAddLine />
                </button>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-300">Total actual</p>
              <p className="text-2xl font-semibold text-primary-600">${formatMoney(totalPriceCents)}</p>
            </div>

            <button
              type="button"
              className="btn-primary flex w-full items-center justify-center gap-2"
              onClick={handleAddToCart}
            >
              <RiShoppingBag2Line size={20} aria-hidden="true" />
              Agregar al pedido
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
