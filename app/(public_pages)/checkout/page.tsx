import CheckoutForm from "@/components/CheckoutForm";
import { getAllProducts } from "@/lib/data/productsData";
import { getActiveUsdVesRate } from "@/lib/data/exchange-rate";
import { getDeliverySettings } from "@/lib/data/store-settings";
import { getCheckoutPaymentInstructions } from "@/lib/payment-config";

export const dynamic = "force-dynamic";

async function CheckoutPage() {
  const [products, activeRate, deliverySettings] = await Promise.all([
    getAllProducts(),
    getActiveUsdVesRate(),
    getDeliverySettings(),
  ]);
  const paymentInstructions = await getCheckoutPaymentInstructions();

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

        <CheckoutForm
          products={products}
          usdToVesRate={activeRate?.rate ?? null}
          deliveryFeeCents={deliverySettings.deliveryFeeCents}
          freeDeliveryMinCents={deliverySettings.freeDeliveryMinCents}
          paymentInstructions={paymentInstructions}
        />
      </div>
    </section>
  );
}

export default CheckoutPage;
