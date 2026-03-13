import Image from "next/image";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { getAllProducts } from "@/lib/data/productsData";
import { getCategoriesWithProductCounts } from "@/lib/data/productsData";

export default async function Home() {
  const allProductsDB = await getAllProducts();
  const allCategoriesDB = await getCategoriesWithProductCounts();
  return (
    <>
      {/* hero section  */}
      <section className="lg:mt-4 lg:px-4">
        <div className="page-container relative min-h-[75svh] overflow-hidden lg:rounded-2xl">
          <div className="absolute inset-0 bg-[url('/images/hero-img.png')] bg-cover bg-center bg-no-repeat" />
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-black/25" />

          <div className="relative z-10 flex min-h-[75svh] items-center justify-center px-6 text-center text-white">
            <div className="max-w-2xl p-6 md:p-10">
              <p className="inline-block rounded-md bg-white/90 px-3 py-1 text-sm font-medium uppercase tracking-wide text-primary-700">
                Comida deliciosa, entrega rápida
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.55)] md:text-5xl lg:text-6xl">
                Pide tu comida favorita
              </h1>
            </div>
          </div>
        </div>
      </section>
      {/* Category section  */}
      <section className="mt-16 relative z-10 lg:-mt-36">
        <div className="page-container">
          <div className="md:hidden">
            <h2 className="mb-3 text-2xl text-slate-900 dark:text-slate-100">
              Nuestras categorias
            </h2>
            <div className="flex flex-wrap gap-2">
              {allCategoriesDB.map((category) => (
                <Link
                  key={category.id}
                  href={`/shop/category/${category.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-primary-300/30 dark:bg-slate-800 dark:text-primary-300 dark:hover:bg-primary-300/10"
                >
                  <span>{category.name}</span>
                  <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-800 dark:bg-primary-300/20 dark:text-primary-200">
                    {category.productCount}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden gap-7 md:grid md:grid-cols-2 lg:grid-cols-3">
            {allCategoriesDB.map((category) => (
              <Link
                key={category.id}
                href={`/shop/category/${category.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-primary-100 bg-white px-7 py-6 transition-all hover:-translate-y-1 hover:border-primary-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:hover:border-primary-400/40 dark:hover:shadow-slate-900/60"
              >
                <div className="absolute -right-16 -top-16 size-40 rounded-full bg-primary-100/80 transition-all duration-300 group-hover:scale-110 dark:bg-primary-400/10" />

                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl text-slate-900 dark:text-slate-100">
                      {category.name}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Explora el menú completo de esta categoría.
                    </p>
                  </div>
                  <span className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:border-primary-400/30 dark:bg-primary-400/10 dark:text-primary-300">
                    {category.productCount} productos
                  </span>
                </div>

                <div className="relative z-10 mx-auto mt-8 max-w-max">
                  <Image
                    src={category.imgUrl}
                    alt={category.name}
                    width={180}
                    height={180}
                    className="h-auto w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <p className="relative z-10 mt-4 text-sm font-medium text-primary-700 transition-colors group-hover:text-primary-800 dark:text-primary-300 dark:group-hover:text-primary-200">
                  Ver menú
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      {/* Products section */}
      <section className="pt-28 mb-4">
        <div className="page-container">
          {/* Title  */}
          <h2 className="section-title text-center">Explora todos los productos</h2>
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
            Ver todos los productos
          </Link>
        </div>
      </section>

      {/* Testimonials  */}
      {/* <section className="py-28">
        <div className="page-container">
          <h2 className="section-title text-center">Lo que dicen nuestros clientes</h2>
          <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-11 lg:mt-14">
            {testimonials.map((testimonial) => (
              // Card 
              <div key={testimonial.id} className="bg-white dark:bg-gray-900 p-8 rounded-xl flex flex-col items-center">
                <span className="text-primary-600 mb-3">
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
      </section> */}
    </>
  );
}
