import OrdersLookup from "./orders-lookup";

export default function OrdersPage() {
  return (
    <section className="bg-neutral-50 py-10 dark:bg-slate-900 md:py-16">
      <div className="page-container space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Mis pedidos
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Consulta el estado de tus pedidos recientes.
          </p>
        </div>

        <OrdersLookup />
      </div>
    </section>
  );
}
