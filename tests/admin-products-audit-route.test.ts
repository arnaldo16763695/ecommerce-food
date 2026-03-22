import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const productFindUniqueMock = vi.fn();
const productFindManyMock = vi.fn();
const categoryFindUniqueMock = vi.fn();
const optionGroupFindManyMock = vi.fn();
const productCreateMock = vi.fn();
const productUpdateMock = vi.fn();
const productFindUniqueOrThrowMock = vi.fn();
const productImageCreateManyMock = vi.fn();
const productImageDeleteManyMock = vi.fn();
const productOptionGroupCreateManyMock = vi.fn();
const productOptionGroupDeleteManyMock = vi.fn();
const productVariantFindFirstMock = vi.fn();
const productVariantUpdateMock = vi.fn();
const auditLogCreateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    product: {
      findUnique: productFindUniqueMock,
      findMany: productFindManyMock,
    },
    category: {
      findUnique: categoryFindUniqueMock,
    },
    optionGroup: {
      findMany: optionGroupFindManyMock,
    },
    productVariant: {
      findFirst: productVariantFindFirstMock,
      update: productVariantUpdateMock,
    },
    auditLog: {
      create: auditLogCreateMock,
    },
    $transaction: transactionMock,
  },
}));

describe("admin products audit integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        product: {
          create: productCreateMock,
          update: productUpdateMock,
          findUniqueOrThrow: productFindUniqueOrThrowMock,
        },
        productImage: {
          deleteMany: productImageDeleteManyMock,
          createMany: productImageCreateManyMock,
        },
        productOptionGroup: {
          deleteMany: productOptionGroupDeleteManyMock,
          createMany: productOptionGroupCreateManyMock,
        },
        productVariant: {
          deleteMany: vi.fn(),
          createMany: vi.fn(),
        },
      }),
    );
  });

  it("writes an audit log when an admin creates a product", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "admin_1", role: "ADMIN" },
    });

    productFindUniqueMock.mockResolvedValueOnce(null);
    categoryFindUniqueMock.mockResolvedValueOnce({ id: "cat_1" });
    optionGroupFindManyMock.mockResolvedValueOnce([{ id: "grp_1" }]);
    productCreateMock.mockResolvedValueOnce({ id: "prod_1" });
    productFindUniqueOrThrowMock.mockResolvedValueOnce({
      id: "prod_1",
      name: "Burger",
      slug: "burger",
      basePriceCents: 2500,
      coverImageUrl: "https://example.com/burger.png",
      isActive: true,
      isFeatured: false,
      trackStock: true,
      stockQuantity: 12,
      createdAt: new Date("2026-03-16T10:00:00.000Z"),
      images: [{ url: "https://example.com/burger.png" }],
      category: {
        id: "cat_1",
        name: "Hamburguesas",
      },
    });
    auditLogCreateMock.mockResolvedValueOnce({ id: "log_1" });

    const mod = await import("../app/api/admin/products/route");
    const req = new Request("http://localhost/api/admin/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "vitest",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({
        name: "Burger",
        slug: "burger",
        basePriceCents: 2500,
        trackStock: true,
        stockQuantity: 12,
        categoryId: "cat_1",
        images: [{ url: "https://example.com/burger.png" }],
        optionGroups: [{ groupId: "grp_1" }],
      }),
    });

    const res = await mod.POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.name).toBe("Burger");
    expect(productImageCreateManyMock).toHaveBeenCalled();
    expect(productOptionGroupCreateManyMock).toHaveBeenCalled();
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: "admin_1",
        actorRole: "ADMIN",
        action: "CREATE",
        entityType: "PRODUCT",
        entityId: "prod_1",
        entityLabel: "Burger",
        summary: "Creo el producto Burger.",
        routePath: "/api/admin/products",
        method: "POST",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        metadata: expect.objectContaining({
          slug: "burger",
          basePriceCents: 2500,
          categoryId: "cat_1",
          isActive: true,
          isFeatured: false,
          trackStock: true,
          stockQuantity: 12,
          variants: [],
        }),
      }),
    });
  });

  it("accepts nullable optional fields when creating a product", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "admin_1", role: "ADMIN" },
    });

    productFindUniqueMock.mockResolvedValueOnce(null);
    productCreateMock.mockResolvedValueOnce({ id: "prod_2" });
    productFindUniqueOrThrowMock.mockResolvedValueOnce({
      id: "prod_2",
      name: "Pepito",
      slug: "pepito",
      basePriceCents: 1800,
      coverImageUrl: null,
      isActive: true,
      isFeatured: false,
      trackStock: false,
      stockQuantity: 0,
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      images: [],
      category: null,
    });
    auditLogCreateMock.mockResolvedValueOnce({ id: "log_2" });

    const mod = await import("../app/api/admin/products/route");
    const req = new Request("http://localhost/api/admin/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Pepito",
        slug: "pepito",
        basePriceCents: 1800,
        prepTimeMin: null,
        categoryId: null,
        coverImageUrl: null,
        isActive: true,
        isFeatured: false,
      }),
    });

    const res = await mod.POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.id).toBe("prod_2");
    expect(productCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        prepTimeMin: null,
        categoryId: null,
        coverImageUrl: null,
      }),
      select: { id: true },
    });
  });

  it("writes stock changes to audit metadata when an admin updates a product", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "admin_1", role: "ADMIN" },
    });

    productFindUniqueMock
      .mockResolvedValueOnce({
        id: "prod_1",
        name: "Burger",
        slug: "burger",
        basePriceCents: 2500,
        trackStock: false,
        stockQuantity: 0,
      })
      .mockResolvedValueOnce(null);
    productUpdateMock.mockResolvedValueOnce({ id: "prod_1" });
    productFindUniqueOrThrowMock.mockResolvedValueOnce({
      id: "prod_1",
      name: "Burger premium",
      slug: "burger-premium",
      basePriceCents: 2700,
      coverImageUrl: "https://example.com/burger-premium.png",
      isActive: true,
      isFeatured: true,
      trackStock: true,
      stockQuantity: 8,
      createdAt: new Date("2026-03-21T11:00:00.000Z"),
      images: [{ url: "https://example.com/burger-premium.png" }],
      category: null,
    });
    auditLogCreateMock.mockResolvedValueOnce({ id: "log_3" });

    const mod = await import("../app/api/admin/products/[productId]/route");
    const req = new Request("http://localhost/api/admin/products/prod_1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "vitest",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({
        name: "Burger premium",
        slug: "burger-premium",
        basePriceCents: 2700,
        trackStock: true,
        stockQuantity: 8,
        isFeatured: true,
      }),
    });

    const res = await mod.PATCH(req as never, {
      params: Promise.resolve({ productId: "prod_1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.name).toBe("Burger premium");
    expect(productUpdateMock).toHaveBeenCalledWith({
      where: { id: "prod_1" },
      data: expect.objectContaining({
        name: "Burger premium",
        slug: "burger-premium",
        basePriceCents: 2700,
        trackStock: true,
        stockQuantity: 8,
        isFeatured: true,
      }),
    });
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE",
        entityType: "PRODUCT",
        entityId: "prod_1",
        entityLabel: "Burger premium",
        summary: "Actualizo el producto Burger premium.",
        metadata: expect.objectContaining({
          previousTrackStock: false,
          nextTrackStock: true,
          previousStockQuantity: 0,
          nextStockQuantity: 8,
        }),
      }),
    });
  });

  it("writes an audit log when an admin updates stock on a variant", async () => {
    authMock.mockResolvedValueOnce({
      user: { id: "admin_1", role: "ADMIN" },
    });

    productVariantFindFirstMock.mockResolvedValueOnce({
      id: "var_1",
      name: "Naranja",
      stockQuantity: 2,
      trackStock: true,
      isActive: true,
      product: {
        id: "prod_1",
        name: "Golden 1 litro",
      },
    });
    productVariantUpdateMock.mockResolvedValueOnce({
      id: "var_1",
      name: "Naranja",
      stockQuantity: 6,
      trackStock: true,
      isActive: true,
      productId: "prod_1",
      product: {
        id: "prod_1",
        name: "Golden 1 litro",
      },
    });
    auditLogCreateMock.mockResolvedValueOnce({ id: "log_4" });

    const mod = await import("../app/api/admin/products/[productId]/variants/[variantId]/route");
    const req = new Request("http://localhost/api/admin/products/prod_1/variants/var_1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "user-agent": "vitest",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({
        trackStock: true,
        stockQuantity: 6,
      }),
    });

    const res = await mod.PATCH(req as never, {
      params: Promise.resolve({ productId: "prod_1", variantId: "var_1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe("var_1");
    expect(productVariantUpdateMock).toHaveBeenCalledWith({
      where: { id: "var_1" },
      data: expect.objectContaining({
        trackStock: true,
        stockQuantity: 6,
      }),
      select: expect.any(Object),
    });
    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UPDATE",
        entityType: "PRODUCT_VARIANT",
        entityId: "var_1",
        entityLabel: "Golden 1 litro - Naranja",
        summary: "Actualizó el stock de la variante Naranja.",
        metadata: expect.objectContaining({
          productId: "prod_1",
          productName: "Golden 1 litro",
          previousStockQuantity: 2,
          nextStockQuantity: 6,
          previousTrackStock: true,
          nextTrackStock: true,
        }),
      }),
    });
  });
});
