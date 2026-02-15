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
    <div className="bg-white p-8 rounded-md flex flex-col relative group gap-2.5 hover:translate-y-[-4px] hover:shadow-lg dark:hover:shadow-slate-600">
      <div className="py-10 relative flex items-center justify-center bg-amber-50 h-full rounded-xl">
        <Image src={img} alt={name} width={200} height={200} />
        <Link href={`/shop/product/${id}/details`} className="absolute top-0 right-0 bg-white gap-2 border border-amber-200 p-2 rounded-xs  opacity-0 group-hover:opacity-100 transition-all hover:text-amber-600 focus:text-amber-600" title="view product details">
          <RiEyeLine />
        </Link>
      </div>
      <div className="space-y-5 mt-auto">
        <button
          className="btn-primary flex items-center gap-1 justify-center w-full"
          aria-label={`Add ${name} to basket`}
        >
          <span>
            <RiShoppingBag2Line size={22} />
          </span>
          Add to basket
        </button>
        <div className="space-y-1">
          <h3 className="text-xl dark:text-slate-900">{name}</h3>
          <p className="text-amber-600 font-semibold">${price}</p>
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
                  className="text-amber-200"
                />
              );
            })}
            <span className="ml-1 text-sm font-medium text-slate-600">
              {star.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
