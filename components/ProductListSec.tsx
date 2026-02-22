"use client";
import { RiFilterLine, RiSearch2Line } from "@remixicon/react";
import React from "react";
import ProductCard from "./ProductCard";
import { AllProducts } from "@/lib/data/productsData";

type Props = { products: AllProducts[] };
function ProductListSec({ products }: Props) {
  return (
    <section>
      <div className="page-container space-y-10">
        {/* Filter bar  */}

        <div className="bg-slate-100 dark:bg-slate-900 border border-gray-200 grid sm:flex gap-1.5 items-center justify-between mt-7 p-4 rounded-lg">
          {/* Serach bar */}
          <div className="border dark:bg-white border-gray-200 flex focus-within:border-amber-600 rounded-md">
            <input
              type="text"
              placeholder="Search"
              className="w-full h-full py-2 outline-none px-3.5 text-gray-700"
            />
            <button className="text-gray-700 h-auto w-10 flex items-center justify-center hover:text-amber-700 transition-colors">
              <RiSearch2Line size={20} className="" />
            </button>
          </div>
          <div className="flex border border-gray-300 rounded-md focus-within:border-amber-500">
            <select className="appearance-auto outline-none px-2.5 py-1.5 flex-1">
              {[
                "sort By",
                "Price: Low to High",
                "Price: High to Low",
                "Name: A to Z",
                "Name: Z to A",
              ].map((item, index) => (
                <option
                  key={index}
                  value={item}
                  className="dark:text-slate-900"
                >
                  {item}
                </option>
              ))}
            </select>
            <button className="flex items-center justify-center w-7 text-neutral-800 focus-within:text-amber-500 transition">
              <RiFilterLine size={20} />
            </button>
          </div>
        </div>
        {/* Product List  */}
        {products.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-14 sm:mb-28">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-gray-500">No products found</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default ProductListSec;
