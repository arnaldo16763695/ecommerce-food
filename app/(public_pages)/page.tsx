import { testimonials } from "@/data/data";
import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { RiDoubleQuotesL } from "@remixicon/react";
import { getAllProducts } from "@/lib/data/productsData";
import { getAllCategories } from "@/lib/data/productsData";

export default async function Home() {
  const allProductsDB = await getAllProducts();
  const allCategoriesDB = await getAllCategories();
  return (
    <>
      {/* hero section  */}
      <section className="lg:mt-4 lg:px-4">
        <div className="page-container bg-[url('/images/hero-img.png')] opacity-100 bg-center bg-cover bg-no-repeat min-h-[75svh] flex items-center justify-center flex-col text-white lg:rounded-2xl text-center">
          <p className="bg-white/70 p-2 rounded-lg  text-amber-600 font-light tracking-wide uppercase">
            Delicious food, fast delivery
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl">
            Order your favorite food
          </h1>
        </div>
      </section>
      {/* Category section  */}
      <section className="mt-16 relative z-10 lg:-mt-36">
        <div className="page-container grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {allCategoriesDB.map((category) => (
            // Card
            <div
              key={category.id}
              className="bg-white border  border-amber-100 block hover:bg-amber-50 rounded-xl px-10 py-8 transition cursor-pointer hover:translate-y-[-4px] hover:shadow-lg dark:hover:shadow-slate-600"
            >
              {/* Title and Quantity  */}
              <div>
                <h2 className="text-2xl dark:text-gray-900">
                  {category.name}
                </h2>
                <p className="text-gray-500">{'10'} items</p>
              </div>
              {/* Product image  */}
              <div className="max-w-max mx-auto mt-12">
                <Image
                  src={category.imgUrl}
                  alt={category.name}
                  width={200}
                  height={200}
                  className="w-auto h-auto object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
      {/* Products section */}
      <section className="pt-28">
        <div className="page-container">
          {/* Title  */}
          <h2 className="section-title text-center">Explore all products</h2>
          {/* Card wrapper */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {allProductsDB.slice(0, 12).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Link
            href="/shop"
            className="btn-primary block mt-14 mx-auto max-w-max"
          >
            View all products
          </Link>
        </div>
      </section>

      {/* Testimonials  */}
      <section className="py-28">
        <div className="page-container">
          <h2 className="section-title text-center">What our Clients say</h2>
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-11 lg:mt-14">
            {testimonials.map((testimonial) => (
              // Card 
              <div key={testimonial.id} className="bg-white dark:bg-gray-900 p-8 rounded-xl flex flex-col items-center">
                <span className="text-amber-600 mb-3">
                  <RiDoubleQuotesL />
                </span>
                <p className="text-gray-600 mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex flex-col items-center mt-auto">
                  <div className="size-16">
                    <Image
                      src={testimonial.img}
                      alt={testimonial.name}
                      width={150}
                      height={150}
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div className="mt-3 text-center">
                      <h3>{testimonial.name}</h3>
                      <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
