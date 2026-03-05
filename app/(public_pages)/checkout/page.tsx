import CheckoutForm from "@/components/CheckoutForm";
import { getAllProducts } from "@/lib/data/productsData";

async function CheckoutPage() {
  const products = await getAllProducts();

  return (
    <section className="bg-neutral-50 py-10 dark:bg-slate-900 md:py-16">
      <div className="page-container space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Finalizar compra
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Completa tus datos para generar el pedido.
          </p>
        </div>

        <CheckoutForm products={products} />
      </div>
    </section>
  );
}

export default CheckoutPage;
