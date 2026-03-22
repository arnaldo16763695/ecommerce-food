"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { RiEyeLine, RiShoppingBag2Line } from "@remixicon/react";

import QuickAddProductSheet from "@/components/QuickAddProductSheet";
import { AllProducts } from "@/lib/data/productsData";
import { resolveProductImageSrc } from "@/lib/product-image";

type Props = { product: AllProducts };

function ProductCard({ product }: Props) {
  const [openQuickAdd, setOpenQuickAdd] = React.useState(false);
  const [quickAddInstanceKey, setQuickAddInstanceKey] = React.useState(0);

  const imageSrc = resolveProductImageSrc(product.images[0]?.url);
  const productDescription =
    product.description?.trim() || "Preparado al momento con ingredientes de calidad.";
  const prepTime =
    typeof product.prepTimeMin === "number"
      ? `${product.prepTimeMin} min de preparacion`
      : null;
  const customizationNames = product.optionGroups
    .slice(0, 2)
    .map((group) => group.group.name);
  const customizationText =
    customizationNames.length > 0
      ? `Personaliza: ${customizationNames.join(" - ")}`
      : "Sin opciones de personalizacion";

  return (
    <>
      <div className="group relative flex flex-col gap-2.5 rounded-md border border-slate-200 bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:shadow-black/30">
        <div className="relative flex h-full items-center justify-center rounded-xl bg-primary-50 py-10 dark:bg-slate-700/60">
          <Image
            src={imageSrc}
            alt={product.name}
            width={200}
            height={200}
            className="h-auto w-auto object-contain"
          />
          {product.isSoldOut ? (
            <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white">
              Agotado
            </span>
          ) : null}
          <Link
            href={`/shop/product/${product.id}/details`}
            className="absolute right-0 top-0 gap-2 rounded-xs border border-primary-200 bg-white p-2 opacity-0 transition-all hover:text-primary-600 focus:text-primary-600 group-hover:opacity-100 dark:border-primary-300/40 dark:bg-slate-800 dark:text-slate-200"
            title="Ver detalles del producto"
          >
            <RiEyeLine />
          </Link>
        </div>
        <div className="mt-auto space-y-5">
          <button
            className="btn-primary flex w-full items-center justify-center gap-1 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label={`Configurar ${product.name} y agregar al pedido`}
            onClick={() => {
              setQuickAddInstanceKey((prev) => prev + 1);
              setOpenQuickAdd(true);
            }}
            disabled={product.isSoldOut}
          >
            <span>
              <RiShoppingBag2Line size={22} />
            </span>
            {product.isSoldOut ? "Producto agotado" : "Agregar al pedido"}
          </button>
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl text-slate-900 dark:text-slate-100">{product.name}</h3>
              <p className="whitespace-nowrap font-semibold text-primary-600">
                ${(product.basePriceCents / 100).toFixed(2)}
              </p>
            </div>
            {prepTime ? (
              <p className="inline-flex rounded-full bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-800 dark:bg-primary-400/15 dark:text-primary-300">
                {prepTime}
              </p>
            ) : null}
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
