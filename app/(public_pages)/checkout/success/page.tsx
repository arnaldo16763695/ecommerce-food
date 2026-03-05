import Link from "next/link";

type Props = {
  searchParams: Promise<{ order?: string }>;
};

async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const orderNumber = params.order;

  return (
    <section className="bg-neutral-50 py-16 dark:bg-slate-900">
      <div className="page-container">
        <div className="mx-auto max-w-xl rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Pedido confirmado
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Gracias por tu compra. Tu pedido fue registrado correctamente.
          </p>
          {orderNumber ? (
            <p className="mt-4 text-sm font-medium text-amber-700 dark:text-amber-300">
              Numero de pedido: #{orderNumber}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href="/shop" className="btn-primary">
              Seguir comprando
            </Link>
            <Link
              href="/shopping-cart"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Volver al carrito
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CheckoutSuccessPage;
