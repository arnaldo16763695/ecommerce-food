import { RiArrowLeftLine, RiShoppingBag2Line } from "@remixicon/react";
import Image from "next/image";
import Link from "next/link";
import { RiStarFill, RiStarHalfFill } from "@remixicon/react";
import { productFeatures } from "@/data/data";

function ProductDEtailsPage() {
  const fullStars = Math.floor(4.5);
  const hasHalfStar = 4.5 % 1 >= 0.5;
  return (
    <>
      {/* Page title  */}
      <div className="bg-amber-50 text-center flex flex-col gap-1 items-center justify-center min-h-56 px-5">
        <h2 className="text-3xl text-neutral-800 px-5">Product details</h2>
        <p className="text-gray-600 max-w-md mx-auto">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Illo atque
          dolorum odio distinctio perferendis dolor, enim .
        </p>
      </div>
      <section className="py-20">
        <div className="page-container">
          {/* Breadcumb  */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <Link
              href="/shop"
              className="hover:text-amber-600 focus:text-amber-600 transition"
            >
              Home
            </Link>
            <span> / </span>
            <Link
              href="/shop"
              className="hover:text-amber-600 focus:text-amber-600 transition"
            >
              Shop
            </Link>
            <span> / </span>
            <p className="text-gray-800">Product</p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center mb-8 font-medium focus:text-amber-700 text-amber-600 gap-2 hover:text-amber-700 transition-colors"
          >
            <RiArrowLeftLine />
            Back to shop
          </Link>

          {/* Wrapper  */}
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Product image  */}
            <div className="aspect-auto bg-amber-300 rounded-2xl overflow-hidden p-5">
              <Image
                src={"/images/product-1.png"}
                alt="Product image"
                width={600}
                height={600}
              />
            </div>
            {/* Product details  */}
            <div className="space-y-4">
              {/* Category  */}
              <p className="text-sm text-amber-600 font-medium">
                {"product category"}
              </p>
              {/* Title  */}
              <h3 className="text-xl text-gray-800">{"product title"}</h3>
              {/* Rating  */}
              <div className="flex items-center gap-3">
                <div className="flex items-center text-amber-500">
                  {[...Array(5)].map((_, i) => {
                    if (i < fullStars) {
                      return (
                        <RiStarFill key={i} aria-hidden="true" size={20} />
                      );
                    }

                    if (i === fullStars && hasHalfStar) {
                      return (
                        <RiStarHalfFill key={i} aria-hidden="true" size={20} />
                      );
                    }

                    return (
                      <RiStarFill
                        key={i}
                        aria-hidden="true"
                        className="text-amber-200"
                      />
                    );
                  })}
                  <span className="ml-1 text-sm font-medium text-gray-600">
                    {(4.5).toFixed(1)}
                  </span>
                </div>
                {/* Price  */}
                <p className="text-2xl font-bold font-cunia text-amber-600">
                  ${"product.price"}
                </p>
                {/* Description  */}
                <p className="">${"product.description"}</p>
                {/* Add to basket  */}
                <button className="btn-primary flex items-center gap-1 justify-center">
                  <span>
                    <RiShoppingBag2Line size={20} />
                  </span>
                  Add to basket
                </button>

                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-200">
                  {/* Features  */}
                  {productFeatures.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="shrink-0 text-amber-600">
                        <feature.icon />
                      </span>
                      <div>
                        <p className="font-cunia">{feature.title}</p>
                        <p className="text-sm text-gray-600">{feature.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default ProductDEtailsPage;
