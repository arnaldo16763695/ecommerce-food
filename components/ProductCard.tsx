"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  RiEyeLine,
  RiShoppingBag2Line,
  RiStarFill,
  RiStarHalfFill,
} from "@remixicon/react";
import { useCartStore } from "../store/cartStore";
import { AllProducts } from "@/lib/data/productsData";

type Props = { product: AllProducts };

function ProductCard({product}: Props) {
  const addToCart = useCartStore((state) => state.addItem);

  const fullStars = Math.floor(5);
  const hasHalfStar = 5 % 1 >= 0.5;

  const handleAddToCart = () => {
    addToCart('5', 1);
  };

  return (
    <div className="group relative flex flex-col gap-2.5 rounded-md border border-slate-200 bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:shadow-black/30">
      <div className="relative flex h-full items-center justify-center rounded-xl bg-amber-50 py-10 dark:bg-slate-700/60">
        <Image
          src={`/images/${product.images[0]?.url || 'product-1.png'}`}
          alt={product.name}
          width={200}
          height={200}
          className="w-auto h-auto object-contain"
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
          aria-label={`Add ${product.name} to basket`}
          onClick={handleAddToCart}
        >
          <span>
            <RiShoppingBag2Line size={22} />
          </span>
          Add to basket
        </button>
        <div className="space-y-1">
          <h3 className="text-xl text-slate-900 dark:text-slate-100">{product.name}</h3>
          <p className="font-semibold text-amber-600">${product.basePriceCents / 100}</p>
          <div className="flex items-center gap-1 text-amber-500">
            {[...Array(5)].map((_, i) => {
              if (i < fullStars) {
                return <RiStarFill key={i} aria-hidden="true" />;
              }

              if (i === fullStars && hasHalfStar) {
                return <RiStarHalfFill key={i} aria-hidden="true" />;
              }

              return (
                <RiStarFill
                  key={i}
                  aria-hidden="true"
                  className="text-amber-200 dark:text-amber-300/40"
                />
              );
            })}
            <span className="ml-1 text-sm font-medium text-slate-600 dark:text-slate-300">
              {5}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
