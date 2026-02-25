"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { RiEyeLine, RiShoppingBag2Line } from "@remixicon/react";

import QuickAddProductSheet from "@/components/QuickAddProductSheet";
import { AllProducts } from "@/lib/data/productsData";

type Props = { product: AllProducts };

function ProductCard({ product }: Props) {
  const [openQuickAdd, setOpenQuickAdd] = React.useState(false);
  const [quickAddInstanceKey, setQuickAddInstanceKey] = React.useState(0);

  const imageUrl = product.images[0]?.url || "product-1.png";
  const productDescription =
    product.description?.trim() || "Freshly prepared with quality ingredients.";
  const prepTime =
    typeof product.prepTimeMin === "number"
      ? `${product.prepTimeMin} min prep`
      : null;
  const customizationNames = product.optionGroups
    .slice(0, 2)
    .map((group) => group.group.name);
  const customizationText =
    customizationNames.length > 0
      ? `Customize: ${customizationNames.join(" - ")}`
      : "No customization options";

  return (
    <>
      <div className="group relative flex flex-col gap-2.5 rounded-md border border-slate-200 bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:shadow-black/30">
        <div className="relative flex h-full items-center justify-center rounded-xl bg-amber-50 py-10 dark:bg-slate-700/60">
          <Image
            src={`/images/${imageUrl}`}
            alt={product.name}
            width={200}
            height={200}
            className="h-auto w-auto object-contain"
          />
          <Link
            href={`/shop/product/${product.id}/details`}
            className="absolute right-0 top-0 gap-2 rounded-xs border border-amber-200 bg-white p-2 opacity-0 transition-all hover:text-amber-600 focus:text-amber-600 group-hover:opacity-100 dark:border-amber-300/40 dark:bg-slate-800 dark:text-slate-200"
            title="view product details"
          >
            <RiEyeLine />
          </Link>
        </div>
        <div className="mt-auto space-y-5">
          <button
            className="btn-primary flex w-full items-center justify-center gap-1"
            aria-label={`Configure ${product.name} and add to order`}
            onClick={() => {
              setQuickAddInstanceKey((prev) => prev + 1);
              setOpenQuickAdd(true);
            }}
          >
            <span>
              <RiShoppingBag2Line size={22} />
            </span>
            Add to order
          </button>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl text-slate-900 dark:text-slate-100">{product.name}</h3>
              <p className="whitespace-nowrap font-semibold text-amber-600">
                ${(product.basePriceCents / 100).toFixed(2)}
              </p>
            </div>
            {prepTime && (
              <p className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-400/15 dark:text-amber-300">
                {prepTime}
              </p>
            )}
            <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
              {productDescription}
            </p>
            <p className="line-clamp-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {customizationText}
            </p>
          </div>
        </div>
      </div>

      <QuickAddProductSheet
        key={quickAddInstanceKey}
        open={openQuickAdd}
        onOpenChange={setOpenQuickAdd}
        product={product}
      />
    </>
  );
}

export default ProductCard;
