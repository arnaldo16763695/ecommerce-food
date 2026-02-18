"use client";
import {
  RiArrowLeftLine,
  RiHeart3Line,
  RiShieldCheckLine,
  RiShoppingBag2Line,
  RiStarFill,
  RiStarHalfFill,
  RiTruckLine,
} from "@remixicon/react";
import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { allProducts, productFeatures } from "@/data/data";
import { useCartStore } from "@/store/cartStore";

function ProductDetailsPage() {
  const params = useParams();
  const productId = parseInt(params.id as string);
  const product = allProducts.find((item) => item.id === Number(productId));
  const addToCart = useCartStore((state) => state.addItem);
  if (!product) {
    notFound();
  }
  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product.id, 1);
  };

  const fullStars = Math.floor(product.star);
  const hasHalfStar = product.star % 1 >= 0.5;
  const relatedProducts = allProducts
    .filter(
      (item) => item.category === product.category && item.id !== product.id,
    )
    .slice(0, 3);

  return (
    <>
      <div className="flex min-h-52 flex-col items-center justify-center gap-2 border-b border-amber-100 bg-amber-50 px-5 text-center dark:border-slate-700 dark:bg-slate-900">
        {/* <span className="rounded-full border border-amber-100 bg-white px-4 py-1 text-sm font-medium text-amber-700 dark:border-amber-300/30 dark:bg-slate-800 dark:text-amber-300">
          Curated for your space
        </span> */}
        <h2 className="px-5 text-3xl text-neutral-800 dark:text-slate-100">
          Product details
        </h2>
        <p className="mx-auto max-w-lg text-gray-600 dark:text-slate-300">
          Compare finishes, check delivery perks, and review every detail before
          adding this piece to your home.
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
                src={product.img}
                alt={product.name}
                width={700}
                height={700}
                className="mx-auto h-auto w-full max-w-lg object-contain"
                priority
              />
            </div>

            <div className="space-y-6 rounded-3xl border border-amber-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 lg:sticky lg:top-24 md:p-8">
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                {product.category}
              </p>
              <h1 className="text-3xl text-gray-900 dark:text-slate-100 md:text-4xl">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4">
                <div
                  className="flex items-center gap-1 text-amber-500"
                  aria-label={`Rating: ${product.star.toFixed(1)} out of 5`}
                >
                  {[...Array(5)].map((_, index) => {
                    if (index < fullStars) {
                      return (
                        <RiStarFill key={index} aria-hidden="true" size={19} />
                      );
                    }

                    if (index === fullStars && hasHalfStar) {
                      return (
                        <RiStarHalfFill
                          key={index}
                          aria-hidden="true"
                          size={19}
                        />
                      );
                    }

                    return (
                      <RiStarFill
                        key={index}
                        aria-hidden="true"
                        className="text-amber-200 dark:text-amber-300/40"
                        size={19}
                      />
                    );
                  })}
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-slate-300">
                  {product.star.toFixed(1)} · 126 reviews
                </span>
              </div>

              <p className="font-cunia text-3xl text-amber-600">
                ${product.price}
              </p>

              <p className="text-gray-700 dark:text-slate-300">
                {product.desc}
              </p>

              <div className="grid gap-3 sm:grid-cols-[140px_1fr_52px]">
                <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900">
                  <span className="text-sm text-gray-600 dark:text-slate-300">
                    Qty
                  </span>
                  <input
                    type="number"
                    min={1}
                    defaultValue={1}
                    className="w-16 bg-transparent text-gray-800 outline-none dark:text-slate-100"
                    aria-label="Product quantity"
                  />
                </label>
                <button
                  className="btn-primary flex items-center justify-center gap-2"
                  aria-label={`Add ${product.name} to basket`}
                  onClick={handleAddToCart}
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Availability
                  </p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    In stock · Ships today
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Estimated delivery
                  </p>
                  <p className="font-semibold text-gray-800 dark:text-slate-100">
                    2 - 4 business days
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
                  />{" "}
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

          {relatedProducts.length > 0 && (
            <div className="mt-14">
              <h2 className="mb-5 text-2xl text-gray-900 dark:text-slate-100">
                You may also like
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedProducts.map((item) => (
                  <Link
                    key={item.id}
                    href={`/shop/product/${item.id}/details`}
                    className="rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-amber-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-amber-400"
                  >
                    <div className="mb-3 flex items-center justify-center rounded-xl bg-amber-50 p-3 dark:bg-slate-700/70">
                      <Image
                        src={item.img}
                        alt={item.name}
                        width={180}
                        height={180}
                        className="h-28 w-28 object-contain"
                      />
                    </div>
                    <p className="mb-1 text-sm font-medium text-amber-700 dark:text-amber-300">
                      {item.category}
                    </p>
                    <h3 className="mb-1 text-lg text-gray-900 dark:text-slate-100">
                      {item.name}
                    </h3>
                    <p className="font-semibold text-amber-600">
                      ${item.price}
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

export default ProductDetailsPage;
