"use client";
import React from "react";
import { usePathname } from "next/navigation";

function PageTitle() {
  const pathname = usePathname();
  return (
    <div className="bg-primary-50 dark:bg-slate-900 text-center flex flex-col gap-1 items-center justify-center min-h-56 px-5">
      <h2 className="text-3xl text-neutral-800 dark:text-slate-200 px-5">
        {pathname === "/shop" && "Tienda"}
        {pathname === "/shopping-cart" && "Bolsa de compras"}
      </h2>
      <p className="text-gray-600 dark:text-slate-200 max-w-md mx-auto">
        Descubre tus productos favoritos, personalízalos y realiza tu pedido
        en pocos pasos.
      </p>
    </div>
  );
}

export default PageTitle;
