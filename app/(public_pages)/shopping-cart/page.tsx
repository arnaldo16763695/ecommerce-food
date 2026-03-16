import CartItems from "@/components/CartItems";
import React from "react";
import { getAllProducts } from "@/lib/data/productsData";
import { getActiveUsdVesRate } from "@/lib/data/exchange-rate";
import { getDeliverySettings } from "@/lib/data/store-settings";

export const dynamic = "force-dynamic";

const ShoppingCartPage = async () => {
  const [products, activeRate, deliverySettings] = await Promise.all([
    getAllProducts(),
    getActiveUsdVesRate(),
    getDeliverySettings(),
  ]);

  return (
    <>
      <CartItems
        products={products}
        usdToVesRate={activeRate?.rate ?? null}
        deliveryFeeCents={deliverySettings.deliveryFeeCents}
        freeDeliveryMinCents={deliverySettings.freeDeliveryMinCents}
      />
    </>
  );
};

export default ShoppingCartPage;
