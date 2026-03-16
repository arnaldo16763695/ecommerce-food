import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const productFindUniqueMock = vi.fn();
const productFindManyMock = vi.fn();
const categoryFindUniqueMock = vi.fn();
const optionGroupFindManyMock = vi.fn();
const productCreateMock = vi.fn();
const productFindUniqueOrThrowMock = vi.fn();
const productImageCreateManyMock = vi.fn();
const productOptionGroupCreateManyMock = vi.fn();
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
          findUniqueOrThrow: productFindUniqueOrThrowMock,
        },
        productImage: {
          createMany: productImageCreateManyMock,
        },
        productOptionGroup: {
          createMany: productOptionGroupCreateManyMock,
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
        action: "CREATE",
        entityType: "PRODUCT",
        entityId: "prod_1",
        entityLabel: "Burger",
        summary: "Creo el producto Burger.",
        routePath: "/api/admin/products",
        method: "POST",
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
        metadata: {
          slug: "burger",
          basePriceCents: 2500,
          categoryId: "cat_1",
          isActive: true,
          isFeatured: false,
        },
      }),
    });
  });
});
