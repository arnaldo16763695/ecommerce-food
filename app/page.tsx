import { categoryItems } from "@/data/data";
import Image from "next/image";

export default function Home() {
  return (
    <>
      {/* hero section  */}
      <section className="lg:mt-4 lg:px-4">
        <div className="container bg-[url('/images/hero-img.png')] bg-center bg-cover bg-no-repeat min-h-[75svh] flex items-center justify-center flex-col text-white lg:rounded-2xl text-center">
          <p className="text-amber-400 font-light tracking-wide uppercase">
            Delicious food, fast delivery
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl">
            Order your favorite food
          </h1>
        </div>
      </section>
      {/* Category section  */}
      <section className="mt-16 relative z-10 lg:-mt-36">
        <div className="container grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {categoryItems.map((category) => (
            // Card
            <div
              key={category.id}
              className="bg-white border  border-amber-100 block hover:bg-amber-50 rounded-xl px-10 py-8 transition cursor-pointer hover:translate-y-[-4px] hover:shadow-lg dark:hover:shadow-slate-600"
            >
              {/* Title and Quantity  */}
              <div>
                <h2 className="text-2xl dark:text-gray-900">
                  {category.title}
                </h2>
                <p className="text-gray-500">{category.quantity} items</p>
              </div>
              {/* Product image  */}
              <div className="max-w-max mx-auto mt-12">
                <Image
                  src={category.img}
                  alt={category.title}
                  width={category.width}
                  height={category.height}
                  // className="w-auto h-auto object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
