"use server";
import prisma from "../prisma";

export async function getAllProducts() {
  try {
    return await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePriceCents: true,
        isFeatured: true,
        prepTimeMin: true,
        categoryId: true,
        images: {
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true, alt: true },
        },
      },
    });
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

export async function getProductById(id: string) {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: id,
        isActive: true,
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        basePriceCents: true,
        isFeatured: true,
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
    return product;
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    throw error;
  }
}

export async function getAllProductsByCategory(categoryId: string | undefined | null) {
  try {
    const getAllProductsByCategory = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: categoryId,
      },
      select:{
        name:true,
        id:true,
        basePriceCents:true,
        categoryId:true,
        slug:true,
        description:true,
        prepTimeMin:true,        
        images:{
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { url: true, alt: true },
        },
        category:{
          select:{
            name:true
          }
        }
      }
    });
    return getAllProductsByCategory;
  } catch (error) {
    console.error("Error fetching products by category:", error);
    throw error;
  }
}

// ✅ This is the exact type your ProductCard should accept
export type AllProducts = Awaited<ReturnType<typeof getAllProducts>>[number];
export type ProductById = Awaited<ReturnType<typeof getProductById>>;
export type AllProductsByCategory = Awaited<ReturnType<typeof getAllProductsByCategory>>[number];
