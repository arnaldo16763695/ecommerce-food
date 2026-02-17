import {
  RiAddLine,
  RiArrowRightLine,
  RiDeleteBin6Line,
  RiInformationLine,
  RiLock2Line,
  RiSubtractLine,
} from "@remixicon/react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const mockCartItems = [
  {
    id: 1,
    name: "Classic Cheeseburger",
    price: 300,
    quantity: 4,
    image: "/images/product-1.png",
    tag: "Most ordered",
  },
  {
    id: 2,
    name: "Spicy Chicken Bowl",
    price: 300,
    quantity: 4,
    image: "/images/product-1.png",
    tag: "New",
  },
];

function CartItems() {
  return (
    <section className="bg-neutral-50 py-10 dark:bg-slate-900 md:py-16">
      <div className="page-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <h3 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-slate-100">
              Shopping cart
            </h3>
            <p className="text-sm text-neutral-600 dark:text-slate-300">
              ({mockCartItems.length}) items ready for checkout
            </p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-300/30 dark:bg-amber-400/10 dark:text-amber-300">
            Free shipping on all orders
          </span>
        </div>

        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          <div className="space-y-4 lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30">
              <div className="divide-y divide-neutral-200 dark:divide-slate-700 md:hidden">
                {mockCartItems.map((item) => (
                  <article key={item.id} className="space-y-4 p-4">
                    <div className="flex gap-4">
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2 dark:border-slate-600 dark:bg-slate-700/60">
                        <Image
                          src={item.image}
                          width={80}
                          height={80}
                          alt={item.name}
                          className="h-auto w-auto object-contain"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-medium leading-tight text-neutral-900 dark:text-slate-100">
                              {item.name}
                            </h3>
                            <span className="mt-1 inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-slate-700 dark:text-slate-200">
                              {item.tag}
                            </span>
                          </div>
                          <button
                            title="Delete item"
                            aria-label={`Delete ${item.name}`}
                            className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:hover:bg-red-400/10 dark:hover:text-red-300 dark:focus:bg-red-400/10 dark:focus:text-red-300"
                          >
                            <RiDeleteBin6Line size={18} />
                          </button>
                        </div>

                        <p className="mb-3 text-sm text-neutral-600 dark:text-slate-300">${item.price} each</p>

                        <div className="inline-flex items-center rounded-xl border border-neutral-300 bg-white dark:border-slate-600 dark:bg-slate-900">
                          <button
                            aria-label={`Decrease quantity for ${item.name}`}
                            className="rounded-l-xl p-2 transition hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                          >
                            <RiSubtractLine size={18} />
                          </button>
                          <p className="min-w-10 px-3 py-2 text-center font-medium text-neutral-800 dark:text-slate-100">
                            {item.quantity}
                          </p>
                          <button
                            aria-label={`Increase quantity for ${item.name}`}
                            className="rounded-r-xl p-2 transition hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                          >
                            <RiAddLine size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-slate-600 dark:bg-slate-700/60">
                      <p className="text-sm font-medium text-neutral-600 dark:text-slate-300">Subtotal</p>
                      <p className="font-semibold text-amber-600">${item.price * item.quantity}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-hidden md:block">
                <table className="min-w-full border-collapse text-left">
                  <thead className="border-b border-neutral-200 bg-neutral-50 text-sm dark:border-slate-700 dark:bg-slate-700/60">
                    <tr>
                      {["Product", "Price", "Quantity", "Total"].map((label) => (
                        <th
                          className="p-4 font-semibold uppercase tracking-wide text-neutral-500 dark:text-slate-300"
                          key={label}
                        >
                          {label}
                        </th>
                      ))}
                      <th className="p-4"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-neutral-200 dark:divide-slate-700">
                    {mockCartItems.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-neutral-50 dark:hover:bg-slate-700/40">
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2 dark:border-slate-600 dark:bg-slate-700/60">
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={52}
                                height={80}
                                className="h-auto w-auto object-contain"
                              />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900 dark:text-slate-100">{item.name}</p>
                              <span className="mt-1 inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-slate-700 dark:text-slate-200">
                                {item.tag}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-neutral-700 dark:text-slate-300">${item.price}</td>
                        <td className="p-4">
                          <div className="inline-flex items-center rounded-xl border border-neutral-300 bg-white dark:border-slate-600 dark:bg-slate-900">
                            <button
                              aria-label={`Decrease quantity for ${item.name}`}
                              className="rounded-l-xl p-2 transition hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                            >
                              <RiSubtractLine size={18} />
                            </button>
                            <p className="min-w-10 px-3 py-2 text-center font-medium text-neutral-800 dark:text-slate-100">
                              {item.quantity}
                            </p>
                            <button
                              aria-label={`Increase quantity for ${item.name}`}
                              className="rounded-r-xl p-2 transition hover:bg-neutral-100 focus:bg-neutral-100 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
                            >
                              <RiAddLine size={18} />
                            </button>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-neutral-900 dark:text-slate-100">
                          ${item.price * item.quantity}
                        </td>
                        <td className="p-4">
                          <button
                            title="Delete item"
                            aria-label={`Delete ${item.name}`}
                            className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 dark:hover:bg-red-400/10 dark:hover:text-red-300 dark:focus:bg-red-400/10 dark:focus:text-red-300"
                          >
                            <RiDeleteBin6Line size={20} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 focus:bg-red-100 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/20 dark:focus:bg-red-400/20">
              <RiDeleteBin6Line size={16} />
              Clear cart
            </button>
          </div>

          <aside className="sticky top-24 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-black/30 lg:col-span-1">
            <h3 className="mb-6 text-xl font-semibold text-neutral-900 dark:text-slate-100">Order summary</h3>

            <div className="mb-5 space-y-3 text-sm">
              <div className="flex justify-between text-neutral-600 dark:text-slate-300">
                <h4>Subtotal</h4>
                <p>$500</p>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-slate-300">
                <h4>Shipping</h4>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">Free</p>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-slate-300">
                <h4>Tax</h4>
                <p>$50</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-slate-600 dark:bg-slate-700/60">
              <div className="mb-1 flex items-center justify-between">
                <h4 className="font-semibold text-neutral-800 dark:text-slate-100">Total</h4>
                <p className="text-xl font-semibold text-neutral-900 dark:text-slate-100">$550</p>
              </div>
              <p className="text-xs text-neutral-500 dark:text-slate-400">Includes all taxes and fees.</p>
            </div>

            <button className="btn-primary inline-flex w-full items-center justify-center gap-2">
              <RiLock2Line size={16} />
              Check out securely
            </button>

            <p className="mt-3 flex items-start gap-2 text-xs text-neutral-500 dark:text-slate-400">
              <RiInformationLine size={16} className="mt-0.5" />
              You can still update quantities at checkout before final payment.
            </p>

            <Link
              href="/shop"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-amber-600 transition hover:underline focus:underline dark:text-amber-400"
            >
              Continue shopping
              <RiArrowRightLine size={16} />
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default CartItems;
