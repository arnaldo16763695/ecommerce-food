import Link from "next/link";

import prisma from "@/lib/prisma";
import { formatMoney } from "@/lib/money";

export default async function Home() {
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
      _count: {
        select: {
          categories: true,
          products: true,
        },
      },
      products: {
        where: { isActive: true },
        orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
        take: 3,
        select: {
          id: true,
          name: true,
          slug: true,
          basePriceCents: true,
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-12">
      <header className="rounded-2xl border bg-muted/20 p-8 md:p-10">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Ecommerce Multitenant
        </p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">
          Elige una tienda para comenzar a comprar
        </h1>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          Cada negocio tiene su propio catálogo, precios y experiencia.
          Selecciona una tienda activa para ver su menú.
        </p>
      </header>

      {tenants.length === 0 ? (
        <section className="rounded-2xl border p-10 text-center">
          <h2 className="text-xl font-semibold">No hay tiendas activas</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea un tenant y ejecuta el seed para ver tiendas disponibles.
          </p>
        </section>
      ) : (
        <section className="space-y-5">
          <h2 className="text-2xl font-semibold">Tiendas disponibles</h2>

          <div className="grid gap-6 md:grid-cols-2">
            {tenants.map((tenant) => (
              <article key={tenant.id} className="rounded-2xl border p-5 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{tenant.name}</h3>
                  <p className="text-sm text-muted-foreground">/t/{tenant.slug}</p>
                </div>

                <div className="flex gap-5 text-sm text-muted-foreground">
                  <span>{tenant._count.categories} categorías</span>
                  <span>{tenant._count.products} productos</span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Productos destacados</p>
                  {tenant.products.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Esta tienda todavía no tiene productos activos.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {tenant.products.map((product) => (
                        <li key={product.id} className="flex justify-between gap-3">
                          <span className="truncate">{product.name}</span>
                          <span className="text-muted-foreground">
                            {formatMoney(product.basePriceCents, tenant.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex gap-3 pt-1">
                  <Link
                    href={`/t/${tenant.slug}`}
                    className="inline-flex rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Ver tienda
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
