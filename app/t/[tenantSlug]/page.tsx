// app/t/[tenantSlug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getTenantBySlug } from "@/lib/tenant";

const FRACTION_DIGITS: Record<string, number> = {
  CLP: 0,
  USD: 2,
  VES: 2, // Venezuelan Bolivar (ISO code)
};

const LOCALE_BY_CURRENCY: Record<string, string> = {
  CLP: "es-CL",
  VES: "es-VE",
  USD: "en-US",
};

function formatMoney(amountMinor: number, currency: string) {
  const digits = FRACTION_DIGITS[currency] ?? 2;
  const locale = LOCALE_BY_CURRENCY[currency] ?? "es-CL";

  const value = amountMinor / 10 ** digits;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export default async function TenantStorefrontPage({
  params,
}: {
  params: { tenantSlug: string } | Promise<{ tenantSlug: string }>;
}) {
  // Support both sync and async params shapes across Next versions.
  const resolvedParams = await Promise.resolve(params);
  const tenantSlug = resolvedParams?.tenantSlug;
  console.log("[tenant-page] params debug:", { tenantSlug, resolvedParams });
  if (!tenantSlug) notFound();

  const tenant = await getTenantBySlug(tenantSlug);
  console.log("[tenant-page] tenant lookup result:", {
    tenantSlug,
    found: Boolean(tenant),
    tenantId: tenant?.id ?? null,
  });
  if (!tenant) notFound();

  const categories = await prisma.category.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { tenantId: tenant.id, isActive: true },
        orderBy: { name: "asc" },
      },
    },
  });

  const uncategorized = await prisma.product.findMany({
    where: { tenantId: tenant.id, isActive: true, categoryId: null },
    orderBy: { name: "asc" },
  });

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
        <p className="text-sm text-muted-foreground">
          /t/{tenant.slug} · {tenant.currency}
        </p>
      </header>

      {categories.length === 0 && uncategorized.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products yet.</p>
      ) : null}

      {categories.map((cat) => (
        <section key={cat.id} className="space-y-3">
          <h2 className="text-xl font-semibold">{cat.name}</h2>

          {cat.products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No products in this category.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cat.products.map((p) => (
                <Link
                  key={p.id}
                  href={`/t/${tenant.slug}/product/${p.slug}`}
                  className="rounded-xl border p-4 hover:shadow-sm transition"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{p.name}</div>
                    {p.description ? (
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {p.description}
                      </div>
                    ) : null}
                    <div className="text-sm">
                      {formatMoney(p.basePriceCents, tenant.currency)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}

      {uncategorized.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Uncategorized</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uncategorized.map((p) => (
              <Link
                key={p.id}
                href={`/t/${tenant.slug}/product/${p.slug}`}
                className="rounded-xl border p-4 hover:shadow-sm transition"
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-sm">
                  {formatMoney(p.basePriceCents, tenant.currency)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
