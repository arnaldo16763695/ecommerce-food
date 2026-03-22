"use server";
import prisma from "../prisma";
import { isProductSoldOutConsideringVariants } from "@/lib/product-variants";

const productCardSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  basePriceCents: true,
  isFeatured: true,
  trackStock: true,
  stockQuantity: true,
  prepTimeMin: true,
  categoryId: true,
  images: {
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: { url: true, alt: true },
  },
  variants: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      name: true,
      priceDeltaCents: true,
      isActive: true,
      trackStock: true,
      stockQuantity: true,
      sortOrder: true,
    },
  },
  optionGroups: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      sortOrder: true,
      group: {
        select: {
          id: true,
          name: true,
          minSelect: true,
          maxSelect: true,
          isActive: true,
          sortOrder: true,
          options: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" as const },
            select: {
              id: true,
              name: true,
              priceDeltaCents: true,
              sortOrder: true,
            },
          },
        },
      },
    },
  },
};

export async function getAllProducts() {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [{ categoryId: null }, { category: { is: { isActive: true } } }],
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: productCardSelect,
    });

    return products.map((product) => ({
      ...product,
      isSoldOut: isProductSoldOutConsideringVariants(product),
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
}

export async function getAllCategories() {
  try {
    return await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ createdAt: "desc" }],
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
}

export async function getCategoriesWithProductCounts() {
  try {
    const [categories, countsByCategory] = await Promise.all([
      prisma.category.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          imgUrl: true,
        },
      }),
      prisma.product.groupBy({
        by: ["categoryId"],
        where: {
          isActive: true,
          categoryId: { not: null },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const countMap = new Map(
      countsByCategory
        .filter((entry) => entry.categoryId)
        .map((entry) => [String(entry.categoryId), entry._count._all]),
    );

    return categories.map((category) => ({
      ...category,
      productCount: countMap.get(category.id) ?? 0,
    }));
  } catch (error) {
    console.error("Error fetching categories with counts:", error);
    throw error;
  }
}

export async function getProductById(id: string) {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: id,
        isActive: true,
        OR: [{ categoryId: null }, { category: { is: { isActive: true } } }],
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePriceCents: true,
        isFeatured: true,
        trackStock: true,
        stockQuantity: true,
        prepTimeMin: true,
        categoryId: true,
        category: {
          select: {
            name: true,
          },
        },
        images: {
          orderBy: { sortOrder: "asc" },
          select: { url: true, alt: true },
        },
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            priceDeltaCents: true,
            isActive: true,
            trackStock: true,
            stockQuantity: true,
            sortOrder: true,
          },
        },
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            sortOrder: true,
            group: {
              select: {
                id: true,
                name: true,
                minSelect: true,
                maxSelect: true,
                isActive: true,
                sortOrder: true,
                options: {
                  where: { isActive: true },
                  orderBy: { sortOrder: "asc" },
                  select: {
                    id: true,
                    name: true,
                    priceDeltaCents: true,
                    sortOrder: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return product
      ? {
          ...product,
          isSoldOut: isProductSoldOutConsideringVariants(product),
        }
      : null;
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    throw error;
  }
}

export async function getAllProductsByCategory(
  categoryId: string | undefined | null,
) {
  try {
    const productsByCategory = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: categoryId,
        category: { is: { isActive: true } },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: {
        name: true,
        id: true,
        basePriceCents: true,
        categoryId: true,
        slug: true,
        description: true,
        trackStock: true,
        stockQuantity: true,
        prepTimeMin: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true, alt: true },
        },
        variants: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            priceDeltaCents: true,
            isActive: true,
            trackStock: true,
            stockQuantity: true,
            sortOrder: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
    });
    return productsByCategory.map((product) => ({
      ...product,
      isSoldOut: isProductSoldOutConsideringVariants(product),
    }));
  } catch (error) {
    console.error("Error fetching products by category:", error);
    throw error;
  }
}

export async function getProductsByCategorySlug(slug: string) {
  try {
    const category = await prisma.category.findFirst({
      where: {
        isActive: true,
        slug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imgUrl: true,
      },
    });

    if (!category) return null;

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: category.id,
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: productCardSelect,
    });

    return {
      category,
      products: products.map((product) => ({
        ...product,
        isSoldOut: isProductSoldOutConsideringVariants(product),
      })),
    };
  } catch (error) {
    console.error("Error fetching products by category slug:", error);
    throw error;
  }
}

export type AllProducts = Awaited<ReturnType<typeof getAllProducts>>[number];
export type ProductById = Awaited<ReturnType<typeof getProductById>>;
export type AllProductsByCategory = Awaited<
  ReturnType<typeof getAllProductsByCategory>
>[number];
export type CategoriesWithProductCounts = Awaited<
  ReturnType<typeof getCategoriesWithProductCounts>
>[number];
