import React from "react";
import { productCardProps } from "../types/types";
import Image from "next/image";
import Link from "next/link";
import {
  RiEyeLine,
  RiShoppingBag2Line,
  RiStarFill,
  RiStarHalfFill,
} from "@remixicon/react";

function ProductCard({ id, img, price, name, star }: productCardProps) {
  const fullStars = Math.floor(star);
  const hasHalfStar = star % 1 >= 0.5;

  return (
    <div className="group relative flex flex-col gap-2.5 rounded-md border border-slate-200 bg-white p-8 transition-all hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:hover:shadow-black/30">
      <div className="relative flex h-full items-center justify-center rounded-xl bg-amber-50 py-10 dark:bg-slate-700/60">
        <Image src={img} alt={name} width={200} height={200} />
        <Link
          href={`/shop/product/${id}/details`}
          className="absolute right-0 top-0 gap-2 rounded-xs border border-amber-200 bg-white p-2 opacity-0 transition-all hover:text-amber-600 focus:text-amber-600 group-hover:opacity-100 dark:border-amber-300/40 dark:bg-slate-800 dark:text-slate-200"
          title="view product details"
        >
          <RiEyeLine />
        </Link>
      </div>
      <div className="mt-auto space-y-5">
        <button
          className="btn-primary flex w-full items-center justify-center gap-1"
          aria-label={`Add ${name} to basket`}
        >
          <span>
            <RiShoppingBag2Line size={22} />
          </span>
          Add to basket
        </button>
        <div className="space-y-1">
          <h3 className="text-xl text-slate-900 dark:text-slate-100">{name}</h3>
          <p className="font-semibold text-amber-600">${price}</p>
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
              {star.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
