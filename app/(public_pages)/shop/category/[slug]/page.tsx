import Link from "next/link";
import { notFound } from "next/navigation";
import ProductListSec from "@/components/ProductListSec";
import { getProductsByCategorySlug } from "@/lib/data/productsData";

async function CategoryShopPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const categoryData = await getProductsByCategorySlug(params.slug);

  if (!categoryData) {
    notFound();
  }

  const { category, products } = categoryData;

  return (
    <>
      <section className="border-b border-amber-100 bg-amber-50 py-14 dark:border-slate-700 dark:bg-slate-900">
        <div className="page-container">
          <nav className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            <Link href="/" className="hover:text-amber-600 transition-colors">
              Home
            </Link>
            {" / "}
            <Link href="/shop" className="hover:text-amber-600 transition-colors">
              Shop
            </Link>
            {" / "}
            <span className="text-slate-800 dark:text-slate-100">{category.name}</span>
          </nav>

          <h1 className="text-3xl text-slate-900 dark:text-slate-100 md:text-4xl">
            {category.name}
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            {products.length} {products.length === 1 ? "item" : "items"} available.
          </p>
        </div>
      </section>

      {products.length > 0 ? (
        <ProductListSec products={products} />
      ) : (
        <section className="py-16">
          <div className="page-container text-center">
            <p className="text-slate-600 dark:text-slate-300">
              No products available in this category yet.
            </p>
            <Link href="/shop" className="btn-primary inline-block mt-6">
              Browse all products
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

export default CategoryShopPage;
