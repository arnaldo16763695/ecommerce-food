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
import { notFound } from "next/navigation";
import { allProducts, productFeatures } from "@/data/data";

type ProductDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const { id } = await params;
  const product = allProducts.find((item) => item.id === Number(id));

  if (!product) {
    notFound();
  }

  const fullStars = Math.floor(product.star);
  const hasHalfStar = product.star % 1 >= 0.5;
  const relatedProducts = allProducts
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 3);

  return (
    <>
      <div className="bg-amber-50 text-center flex flex-col gap-2 items-center justify-center min-h-52 px-5 border-b border-amber-100">
        <span className="rounded-full bg-white px-4 py-1 text-sm font-medium text-amber-700 border border-amber-100">
          Curated for your space
        </span>
        <h2 className="text-3xl text-neutral-800 px-5">Product details</h2>
        <p className="text-gray-600 max-w-lg mx-auto">
          Compare finishes, check delivery perks, and review every detail before
          adding this piece to your home.
        </p>
      </div>

      <section className="py-14 md:py-20 bg-gradient-to-b from-white to-amber-50/40">
        <div className="page-container">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-6"
          >
            <Link
              href="/"
              className="hover:text-amber-600 focus:text-amber-600 transition"
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/shop"
              className="hover:text-amber-600 focus:text-amber-600 transition"
            >
              Shop
            </Link>
            <span>/</span>
            <p className="text-gray-800 truncate max-w-56 md:max-w-full">
              {product.name}
            </p>
          </nav>

          <Link
            href="/shop"
            className="inline-flex items-center mb-8 font-medium focus:text-amber-700 text-amber-600 gap-2 hover:text-amber-700 transition-colors"
          >
            <RiArrowLeftLine />
            Back to shop
          </Link>

          <div className="grid lg:grid-cols-2 gap-8 xl:gap-14 items-start">
            <div className="bg-gradient-to-b from-amber-100 to-amber-50 rounded-3xl overflow-hidden p-8 border border-amber-200/60">
              <Image
                src={product.img}
                alt={product.name}
                width={700}
                height={700}
                className="mx-auto w-full max-w-lg h-auto object-contain"
                priority
              />
            </div>

            <div className="space-y-6 lg:sticky lg:top-24 bg-white border border-amber-100 rounded-3xl p-6 md:p-8 shadow-sm">
              <p className="text-sm text-amber-700 font-semibold tracking-wide uppercase">
                {product.category}
              </p>
              <h1 className="text-3xl md:text-4xl text-gray-900">{product.name}</h1>

              <div className="flex flex-wrap items-center gap-4">
                <div
                  className="flex items-center gap-1 text-amber-500"
                  aria-label={`Rating: ${product.star.toFixed(1)} out of 5`}
                >
                  {[...Array(5)].map((_, index) => {
                    if (index < fullStars) {
                      return <RiStarFill key={index} aria-hidden="true" size={19} />;
                    }

                    if (index === fullStars && hasHalfStar) {
                      return (
                        <RiStarHalfFill key={index} aria-hidden="true" size={19} />
                      );
                    }

                    return (
                      <RiStarFill
                        key={index}
                        aria-hidden="true"
                        className="text-amber-200"
                        size={19}
                      />
                    );
                  })}
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {product.star.toFixed(1)} · 126 reviews
                </span>
              </div>

              <p className="text-3xl font-cunia text-amber-600">${product.price}</p>

              <p className="text-gray-700">{product.desc}</p>

              <div className="grid gap-3 sm:grid-cols-[140px_1fr_52px]">
                <label className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
                  <span className="text-sm text-gray-600">Qty</span>
                  <input
                    type="number"
                    min={1}
                    defaultValue={1}
                    className="w-16 bg-transparent outline-none text-gray-800"
                    aria-label="Product quantity"
                  />
                </label>
                <button
                  className="btn-primary flex items-center gap-2 justify-center"
                  aria-label={`Add ${product.name} to basket`}
                >
                  <RiShoppingBag2Line size={20} aria-hidden="true" />
                  Add to basket
                </button>
                <button
                  className="border border-gray-200 rounded-lg flex items-center justify-center hover:border-amber-400 hover:text-amber-700 transition-colors"
                  aria-label="Save to wishlist"
                >
                  <RiHeart3Line size={20} aria-hidden="true" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4 bg-white">
                  <p className="text-sm text-gray-500">Availability</p>
                  <p className="font-semibold text-emerald-700">In stock · Ships today</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-4 bg-white">
                  <p className="text-sm text-gray-500">Estimated delivery</p>
                  <p className="font-semibold text-gray-800">2 - 4 business days</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5 bg-white">
                <h2 className="text-lg text-gray-800 mb-4">Why shoppers love it</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {productFeatures.map((feature) => (
                    <div key={feature.id} className="flex items-start gap-3">
                      <span className="shrink-0 rounded-full bg-amber-100 p-2 text-amber-700">
                        <feature.icon aria-hidden="true" />
                      </span>
                      <div>
                        <p className="font-cunia text-gray-900">{feature.title}</p>
                        <p className="text-sm text-gray-600">{feature.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-5 text-sm text-gray-600 pt-1">
                <p className="inline-flex items-center gap-2">
                  <RiTruckLine className="text-amber-600" aria-hidden="true" /> Free
                  shipping over $100
                </p>
                <p className="inline-flex items-center gap-2">
                  <RiShieldCheckLine
                    className="text-amber-600"
                    aria-hidden="true"
                  />
                  30-day hassle-free returns
                </p>
              </div>
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <div className="mt-14">
              <h2 className="text-2xl text-gray-900 mb-5">You may also like</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedProducts.map((item) => (
                  <Link
                    key={item.id}
                    href={`/shop/product/${item.id}/details`}
                    className="rounded-2xl border border-gray-200 bg-white p-4 hover:border-amber-300 hover:shadow-sm transition"
                  >
                    <div className="bg-amber-50 rounded-xl p-3 mb-3 flex items-center justify-center">
                      <Image
                        src={item.img}
                        alt={item.name}
                        width={180}
                        height={180}
                        className="h-28 w-28 object-contain"
                      />
                    </div>
                    <p className="text-sm text-amber-700 font-medium mb-1">{item.category}</p>
                    <h3 className="text-lg text-gray-900 mb-1">{item.name}</h3>
                    <p className="text-amber-600 font-semibold">${item.price}</p>
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
