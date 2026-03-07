import CartItems from "@/components/CartItems";
import PageTitle from "@/components/PageTitle";
import React from "react";
import { getAllProducts } from "@/lib/data/productsData";
import { getActiveUsdVesRate } from "@/lib/data/exchange-rate";

const ShoppingCartPage = async () => {
  const [products, activeRate] = await Promise.all([
    getAllProducts(),
    getActiveUsdVesRate(),
  ]);

  return (
    <>
      <PageTitle />
      <CartItems products={products} usdToVesRate={activeRate?.rate ?? null} />
    </>
  );
};

export default ShoppingCartPage;
