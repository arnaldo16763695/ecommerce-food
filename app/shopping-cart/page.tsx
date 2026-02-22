import CartItems from "@/components/CartItems";
import PageTitle from "@/components/PageTitle";
import React from "react";
import { getAllProducts } from "@/lib/data/productsData";

const ShoppingCartPage = async () => {
  const products = await getAllProducts()
  return (
    <>
      <PageTitle />
      <CartItems products={products} /> 
    </>
  );
};

export default ShoppingCartPage;
