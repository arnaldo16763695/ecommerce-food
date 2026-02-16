import { RiAddLine, RiDeleteBin6Line, RiSubtractLine } from "@remixicon/react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

function CartItems() {
  return (
    <section className="py-10 md:py-20">
      <div className="page-container">
        {/* Title  */}
        <div className="mb-8 space-y-1.5">
          <h3 className="text-3xl">Shopping cart</h3>
          <p className="text-neutral-600">(2) items in your cart</p>
        </div>
        <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
          {/* Cart items  */}
          <div className="lg:col-span-2">
            <div className="bg-white border p-4 border-gray-200 rounded-lg overflow-hidden">
              {/* Mobile view  */}
              <div className="md:hidden divide-y divide-gray-200">
                {/* item  */}
                <div className="">
                  {/* Product  */}
                  <div className="flex gap-4">
                    {/* img  */}
                    <div className="">
                      <Image
                        src={"/images/product-1.png"}
                        width={80}
                        height={80}
                        alt="'ite.name'"
                        className="rounded-md w-auto h-auto object-contain"
                      />
                    </div>
                    {/* Content  */}
                    <div className="flex-1">
                      <h3 className="font-medium mb-2">{"item.name"}</h3>
                      <p className="text-gray-600 mb-2">${"item.price"}</p>

                      {/* Counter  */}
                      <div className="flex items-center gap-2 border border-gray-300 w-fit rounded-lg">
                        <button className="p-2 hover:bg-gray-100 focus:bg-gray-100 transition">
                          <RiSubtractLine size={18} />
                        </button>
                        <p className="p-3 font-medium">{0}</p>
                        <button className="p-2 hover:bg-gray-100 focus:bg-gray-100 transition">
                          <RiAddLine size={18} />
                        </button>
                      </div>
                    </div>
                    {/* Trash icon  */}
                    <button
                      title="Delete item"
                      className=" text-red-500 hover:text-red-700 focus:text-red-700 transition-colors"
                    >
                      <RiDeleteBin6Line size={20} />
                    </button>
                  </div>
                  {/* Total price  */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
                    <p className="text-gray-600 font-semibold">Subtotal:</p>
                    <p className="text-amber-600 font-cunia ">${300}</p>
                  </div>
                </div>
              </div>
              {/* Desktop Menu  */}
              <div className="hidden md:block overflow-x-hidden">
                <table className="min-w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {["Product", "price", "Quantity", "Total"].map(
                        (label) => (
                          <th className="p-4 font-semibold " key={label}>
                            {label}
                          </th>
                        ),
                      )}
                      <th className="p-4"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {/* item  */}
                    <tr>
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div>
                            <Image
                              src="/images/product-1.png"
                              alt="Product"
                              width={50}
                              height={80}
                              className="rounded-md w-auto h-auto object-contain"
                            />
                          </div>
                          <p className="font-medium">{"item.name"}</p>
                        </div>
                      </td>
                      <td className="text-gray-700 p-4">${300}</td>
                      <td className="p-4">
                        {/* Counter */}
                        <div className="flex items-center gap-2 border border-gray-300 w-fit rounded-lg">
                          <button className="p-2 hover:bg-gray-100 focus:bg-gray-100 transition">
                            <RiSubtractLine size={18} />
                          </button>
                          <p className="p-3 font-medium">{0}</p>
                          <button className="p-2 hover:bg-gray-100 focus:bg-gray-100 transition">
                            <RiAddLine size={18} />
                          </button>
                        </div>
                      </td>
                      {/* Total price  */}
                      <td className="p-4 font-semibold">${1200}</td>
                      <td className="p-4">
                        <button
                          title="Delete item"
                          className="text-red-500 hover:text-red-700 focus:text-red-700 transition-colors"
                        >
                          <RiDeleteBin6Line size={20} />
                        </button>
                      </td>
                    </tr>
                    {/* item  */}
                    <tr>
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div>
                            <Image
                              src="/images/product-1.png"
                              alt="Product"
                              width={50}
                              height={80}
                              className="rounded-md w-auto h-auto object-contain"
                            />
                          </div>
                          <p className="font-medium">{"item.name"}</p>
                        </div>
                      </td>
                      <td className="text-gray-700 p-4">${300}</td>
                      <td className="p-4">
                        {/* Counter */}
                        <div className="flex items-center gap-2 border border-gray-300 w-fit rounded-lg">
                          <button className="p-2 hover:bg-gray-100 focus:bg-gray-100 transition">
                            <RiSubtractLine size={18} />
                          </button>
                          <p className="p-3 font-medium">{0}</p>
                          <button className="p-2 hover:bg-gray-100 focus:bg-gray-100 transition">
                            <RiAddLine size={18} />
                          </button>
                        </div>
                      </td>
                      {/* Total price  */}
                      <td className="p-4 font-semibold">${1200}</td>
                      <td className="p-4">
                        <button
                          title="Delete item"
                          className="text-red-500 hover:text-red-700 focus:text-red-700 transition-colors"
                        >
                          <RiDeleteBin6Line size={20} />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* Clear cart btn  */}
            <button className="mt-4 text-red-500 flex items-center gap-2 hover:text-red-700 focus:text-red-700 transition-colors">
              <RiDeleteBin6Line />
              Clear cart
            </button>
          </div>
          {/* Order summary  */}
          <div className="lg:col-span-1 border border-gray-200 bg-white p-6 rounded-lg sticky top-24">
            {/* Title  */}
            <h3 className="text-xl mb-6">Order summary</h3>
            <div className="space-y-3 mb-6">
              {/* Total  */}
              <div className="flex justify-between text-gray-600">
                <h4>Subtotal:</h4>
                <p>${500}</p>
              </div>
              {/* Shipping  */}
              <div className="flex justify-between text-gray-600">
                <h4>Shipping:</h4>
                <p className="text-amber-600">{"Free"}</p>
              </div>

              {/* Tax  */}
              <div className="flex justify-between text-gray-600">
                <h4>Tax:</h4>
                <p>${50}</p>
              </div>
            </div>
            {/* Total price  */}
            <div className="border-t border-gray-200 pt-4 mb-6">
              <h4>Total:</h4>
              <p>${550}</p>
            </div>

            {/* Checkout btn  */}
            <button className="btn-primary">Check out</button>

            <Link href={"/shop"} className="block mt-4 text-amber-600 hover:underline focus:underline max-w-max">Continue shopping</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CartItems;
