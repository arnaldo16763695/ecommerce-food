"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  RiAddLine,
  RiArrowLeftLine,
  RiHeart3Line,
  RiShieldCheckLine,
  RiShoppingBag2Line,
  RiStarFill,
  RiSubtractLine,
  RiTruckLine,
} from "@remixicon/react";
import Image from "next/image";
import { useCartStore } from "../store/cartStore";
import { ProductById } from "@/lib/data/productsData";
import { AllProductsByCategory } from "@/lib/data/productsData";
import { productFeatures } from "@/data/data";
import { buildCartLineKey } from "@/lib/cart-line-key";

type Props = {
  product: ProductById;
  relatedProducts: AllProductsByCategory[];
};

type ProductOptionGroup = NonNullable<ProductById>["optionGroups"][number];
type Group = ProductOptionGroup["group"];

function formatMoney(cents: number) {
  return (cents / 100).toFixed(2);
}

function ProductDetails({ product, relatedProducts }: Props) {
  const addToCart = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string[]>
  >({});
  const [attemptedAdd, setAttemptedAdd] = useState(false);

  if (!product) {
    return (
      <section className="py-20 text-center">
        <p className="text-lg text-slate-700 dark:text-slate-200">
          Product not found.
        </p>
        <Link href="/shop" className="mt-4 inline-block btn-primary">
          Back to shop
        </Link>
      </section>
    );
  }

  const minimalRelatedProducts = relatedProducts
    .filter(
      (item) => item.categoryId === product.categoryId && item.id !== product.id,
    )
    .slice(0, 3);

  const customizationGroups = product.optionGroups
    .map((relation) => relation.group)
    .filter((group) => group.isActive && group.options.length > 0);

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

  const groupErrors = customizationGroups.reduce<Record<string, string>>(
    (acc, group) => {
      const selectedCount = selectedOptions[group.id]?.length ?? 0;

      if (selectedCount < group.minSelect) {
        acc[group.id] = `Choose at least ${group.minSelect}.`;
      } else if (selectedCount > group.maxSelect) {
        acc[group.id] = `Choose up to ${group.maxSelect}.`;
      }

      return acc;
    },
    {},
  );

  const canAddToCart = Object.keys(groupErrors).length === 0;

  const handleSelectOption = (group: Group, optionId: string) => {
    setSelectedOptions((prev) => {
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
    setNotes("");
  };

  return (
    <>
      <div className="flex min-h-52 flex-col items-center justify-center gap-2 border-b border-amber-100 bg-amber-50 px-5 text-center dark:border-slate-700 dark:bg-slate-900">
        <h2 className="px-5 text-3xl text-neutral-800 dark:text-slate-100">
          Product details
        </h2>
        <p className="mx-auto max-w-lg text-gray-600 dark:text-slate-300">
          Customize your order before adding it to your cart.
        </p>
      </div>

      <section className="bg-linear-to-b from-slate-50 to-amber-50/40 py-14 dark:from-slate-900 dark:to-slate-800/50 md:py-20">
        <div className="page-container">
          <nav
            aria-label="Breadcrumb"
            className="mb-6 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-slate-300"
          >
            <Link
              href="/"
              className="transition hover:text-amber-600 focus:text-amber-600"
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/shop"
              className="transition hover:text-amber-600 focus:text-amber-600"
            >
              Shop
            </Link>
            <span>/</span>
            <p className="max-w-56 truncate text-gray-800 dark:text-slate-100 md:max-w-full">
              {product.name}
            </p>
          </nav>

          <Link
            href="/shop"
            className="mb-8 inline-flex items-center gap-2 font-medium text-amber-600 transition-colors hover:text-amber-700 focus:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
          >
            <RiArrowLeftLine />
            Back to shop
          </Link>

          <div className="grid items-start gap-8 lg:grid-cols-2 xl:gap-14">
            <div className="overflow-hidden rounded-3xl border border-amber-200/60 bg-linear-to-b from-amber-100 to-amber-50 p-8 dark:border-slate-700 dark:from-slate-800 dark:to-slate-700">
              <Image
                src={`/images/${product.images[0]?.url || "product-1.png"}`}
                alt={product.name}
                width={700}
                height={700}
                className="mx-auto h-auto w-full max-w-lg object-contain"
                priority
              />
            </div>

            <div className="space-y-6 rounded-3xl border border-amber-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:sticky lg:top-24 md:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                {product.category?.name ?? product.categoryId ?? "Menu item"}
              </p>
              <h1 className="text-3xl text-gray-900 dark:text-slate-100 md:text-4xl">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4">
                <div
                  className="flex items-center gap-1 text-amber-500"
                  aria-label="Rating: 5 out of 5"
                >
                  {[...Array(5)].map((_, index) => (
                    <RiStarFill key={index} aria-hidden="true" size={19} />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-slate-300">
                  5.0 · 126 reviews
                </span>
              </div>

              <p className="font-cunia text-3xl text-amber-600">
                ${formatMoney(unitPriceCents)}
              </p>

              <p className="text-gray-700 dark:text-slate-300">
                {product.description}
              </p>

              {customizationGroups.length > 0 ? (
                <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                    Customize your item
                  </h2>
                  {customizationGroups.map((group) => {
                    const selectedCount = selectedOptions[group.id]?.length ?? 0;
                    const isSingleChoice = group.maxSelect === 1;

                    return (
                      <div key={group.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-800 dark:text-slate-100">
                            {group.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {group.minSelect > 0
                              ? `Required · pick ${group.minSelect}-${group.maxSelect}`
                              : `Optional · up to ${group.maxSelect}`}{" "}
                            ({selectedCount}/{group.maxSelect})
                          </p>
                        </div>

                        <div className="grid gap-2">
                          {group.options.map((option) => {
                            const isSelected =
                              selectedOptions[group.id]?.includes(option.id) ??
                              false;
                            const isDisabled =
                              !isSelected &&
                              !isSingleChoice &&
                              selectedCount >= group.maxSelect;

                            return (
                              <label
                                key={option.id}
                                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition-colors ${
                                  isSelected
                                    ? "border-amber-400 bg-amber-50 dark:border-amber-400 dark:bg-amber-400/10"
                                    : "border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800"
                                } ${isDisabled ? "cursor-not-allowed opacity-60" : ""}`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type={isSingleChoice ? "radio" : "checkbox"}
                                    name={group.id}
                                    checked={isSelected}
                                    disabled={isDisabled}
                                    onChange={() =>
                                      handleSelectOption(group, option.id)
                                    }
                                  />
                                  <span className="text-sm text-gray-800 dark:text-slate-100">
                                    {option.name}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                  {option.priceDeltaCents > 0
                                    ? `+$${formatMoney(option.priceDeltaCents)}`
                                    : "Included"}
                                </span>
                              </label>
                            );
                          })}
                        </div>

                        {attemptedAdd && groupErrors[group.id] && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {groupErrors[group.id]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-3 text-sm text-gray-600 dark:border-slate-600 dark:text-slate-300">
                  This product has no customization options.
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="item-notes"
                  className="text-sm font-medium text-gray-700 dark:text-slate-300"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="item-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: no onion, extra crispy..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-amber-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  rows={3}
                  maxLength={180}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-[140px_1fr_52px]">
                <div className="inline-flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2 py-1.5 dark:border-slate-600 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700"
                    aria-label="Decrease quantity"
                  >
                    <RiSubtractLine />
                  </button>
                  <span className="min-w-8 text-center text-sm font-semibold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700"
                    aria-label="Increase quantity"
                  >
                    <RiAddLine />
                  </button>
                </div>
                <button
                  className="btn-primary flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70"
                  aria-label={`Add ${product.name} to basket`}
                  onClick={handleAddToCart}
                  disabled={!canAddToCart && attemptedAdd}
                >
                  <RiShoppingBag2Line size={20} aria-hidden="true" />
                  Add to basket
                </button>
                <button
                  className="flex items-center justify-center rounded-lg border border-gray-200 transition-colors hover:border-amber-400 hover:text-amber-700 dark:border-slate-600 dark:text-slate-200 dark:hover:border-amber-400 dark:hover:text-amber-300"
                  aria-label="Save to wishlist"
                >
                  <RiHeart3Line size={20} aria-hidden="true" />
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Current total
                </p>
                <p className="text-2xl font-semibold text-amber-600">
                  ${formatMoney(totalPriceCents)}
                </p>
                {selectedOptionsList.length > 0 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Includes ${formatMoney(optionsDeltaCents)} in add-ons.
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Availability
                  </p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    In stock
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Preparation time
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-slate-100">
                    {product.prepTimeMin ? `${product.prepTimeMin} min` : "Fast"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-600 dark:bg-slate-900">
                <h2 className="mb-4 text-lg text-gray-800 dark:text-slate-100">
                  Why shoppers love it
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {productFeatures.map((feature) => (
                    <div key={feature.id} className="flex items-start gap-3">
                      <span className="shrink-0 rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
                        <feature.icon aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-cunia text-gray-900 dark:text-slate-100">
                          {feature.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-slate-300">
                          {feature.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-5 pt-1 text-sm text-gray-600 dark:text-slate-300">
                <p className="inline-flex items-center gap-2">
                  <RiTruckLine
                    className="text-amber-600 dark:text-amber-400"
                    aria-hidden="true"
                  />
                  Free shipping over $100
                </p>
                <p className="inline-flex items-center gap-2">
                  <RiShieldCheckLine
                    className="text-amber-600 dark:text-amber-400"
                    aria-hidden="true"
                  />
                  30-day hassle-free returns
                </p>
              </div>
            </div>
          </div>

          {minimalRelatedProducts.length > 0 && (
            <div className="mt-14">
              <h2 className="mb-5 text-2xl text-gray-900 dark:text-slate-100">
                You may also like
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {minimalRelatedProducts.map((item) => (
                  <Link
                    key={item.id}
                    href={`/shop/product/${item.id}/details`}
                    className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-amber-400"
                  >
                    <div className="mb-3 flex items-center justify-center rounded-xl bg-amber-50 p-3 dark:bg-slate-700/70">
                      <Image
                        src={`/images/${item.images[0]?.url || "product-1.png"}`}
                        alt={item.name}
                        width={180}
                        height={180}
                        className="h-28 w-28 object-contain"
                      />
                    </div>
                    <p className="mb-1 text-sm font-medium text-amber-700 dark:text-amber-300">
                      {item.category?.name}
                    </p>
                    <h3 className="mb-1 text-lg text-gray-900 dark:text-slate-100">
                      {item.name}
                    </h3>
                    <p className="font-semibold text-amber-600">
                      ${formatMoney(item.basePriceCents)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default ProductDetails;
