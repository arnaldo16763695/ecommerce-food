import Link from "next/link";
import { notFound } from "next/navigation";

import prisma from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";
import { formatMoney } from "@/lib/money";

export default async function TenantProductDetailPage({
  params,
}: {
  params:
    | { tenantSlug: string; productSlug: string }
    | Promise<{ tenantSlug: string; productSlug: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const tenantSlug = resolvedParams?.tenantSlug;
  const productSlug = resolvedParams?.productSlug;

  if (!tenantSlug || !productSlug) notFound();

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const product = await prisma.product.findUnique({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: productSlug,
      },
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      optionGroups: {
        orderBy: { sortOrder: "asc" },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              minSelect: true,
              maxSelect: true,
              options: {
                where: { isActive: true },
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  name: true,
                  priceDeltaCents: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!product || !product.isActive) notFound();

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-8">
      <header className="space-y-3">
        <Link
          href={`/t/${tenant.slug}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to menu
        </Link>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{tenant.name}</p>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-lg font-semibold">
            {formatMoney(product.basePriceCents, tenant.currency)}
          </p>
        </div>

        {product.description ? (
          <p className="text-muted-foreground">{product.description}</p>
        ) : null}

        {product.category ? (
          <p className="text-sm text-muted-foreground">
            Category: {product.category.name}
          </p>
        ) : null}
      </header>

      {product.optionGroups.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Available modifiers</h2>

          <div className="space-y-4">
            {product.optionGroups.map(({ id, group }) => (
              <article key={id} className="rounded-xl border p-4 space-y-2">
                <div>
                  <h3 className="font-medium">{group.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose {group.minSelect} to {group.maxSelect}
                  </p>
                </div>

                <ul className="space-y-1 text-sm">
                  {group.options.map((option) => (
                    <li key={option.id} className="flex justify-between gap-3">
                      <span>{option.name}</span>
                      <span className="text-muted-foreground">
                        {option.priceDeltaCents === 0
                          ? "Included"
                          : `+ ${formatMoney(option.priceDeltaCents, tenant.currency)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">This product has no modifiers.</p>
      )}
    </main>
  );
}
