import "dotenv/config";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function upsertOptionGroup(params: {
  tenantId: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  sortOrder?: number;
}) {
  const { tenantId, name, minSelect, maxSelect, sortOrder = 0 } = params;

  const existing = await prisma.optionGroup.findFirst({
    where: { tenantId, name },
    select: { id: true },
  });

  if (existing) {
    return prisma.optionGroup.update({
      where: { id: existing.id },
      data: { minSelect, maxSelect, sortOrder, isActive: true },
    });
  }

  return prisma.optionGroup.create({
    data: { tenantId, name, minSelect, maxSelect, sortOrder, isActive: true },
  });
}

async function upsertOption(params: {
  groupId: string;
  name: string;
  priceDeltaCents?: number;
  sortOrder?: number;
}) {
  const { groupId, name, priceDeltaCents = 0, sortOrder = 0 } = params;

  const existing = await prisma.option.findFirst({
    where: { groupId, name },
    select: { id: true },
  });

  if (existing) {
    return prisma.option.update({
      where: { id: existing.id },
      data: { priceDeltaCents, sortOrder, isActive: true },
    });
  }

  return prisma.option.create({
    data: { groupId, name, priceDeltaCents, sortOrder, isActive: true },
  });
}

async function main() {
  // =========================
  // 1) Seed user (Credentials)
  // =========================
  const email = process.env.SEED_EMAIL ?? "demo@local.test";
  const password =
    process.env.SEED_PASSWORD ?? randomBytes(12).toString("base64url");

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      name: "Demo User",
      passwordHash,
    },
    select: { id: true, email: true },
  });

  // =========================
  // 2) Tenant
  // =========================
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: { name: "Demo Restaurant", isActive: true },
    create: {
      name: "Demo Restaurant",
      slug: "demo",
      currency: "CLP",
      timezone: "America/Santiago",
      isActive: true,
    },
    select: { id: true, slug: true },
  });

  // =========================
  // 3) Link user to tenant (OWNER)
  // =========================
  await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: { role: "OWNER" },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: "OWNER",
    },
  });

  // =========================
  // 4) Categories
  // =========================
  const burgers = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "burgers" } },
    update: { name: "Burgers", sortOrder: 1, isActive: true },
    create: {
      tenantId: tenant.id,
      name: "Burgers",
      slug: "burgers",
      sortOrder: 1,
      isActive: true,
    },
    select: { id: true },
  });

  const drinks = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "drinks" } },
    update: { name: "Drinks", sortOrder: 2, isActive: true },
    create: {
      tenantId: tenant.id,
      name: "Drinks",
      slug: "drinks",
      sortOrder: 2,
      isActive: true,
    },
    select: { id: true },
  });

  // =========================
  // 5) Option groups + options
  // =========================
  const ingredients = await upsertOptionGroup({
    tenantId: tenant.id,
    name: "Ingredients",
    minSelect: 0,
    maxSelect: 3,
    sortOrder: 1,
  });

  const extras = await upsertOptionGroup({
    tenantId: tenant.id,
    name: "Extras",
    minSelect: 0,
    maxSelect: 5,
    sortOrder: 2,
  });

  await upsertOption({ groupId: ingredients.id, name: "No lettuce", sortOrder: 1 });
  await upsertOption({ groupId: ingredients.id, name: "No tomato", sortOrder: 2 });
  await upsertOption({ groupId: ingredients.id, name: "No onion", sortOrder: 3 });

  await upsertOption({
    groupId: extras.id,
    name: "Extra cheese",
    priceDeltaCents: 500,
    sortOrder: 1,
  });
  await upsertOption({
    groupId: extras.id,
    name: "Bacon",
    priceDeltaCents: 700,
    sortOrder: 2,
  });

  // =========================
  // 6) Products
  // =========================
  const classicBurger = await prisma.product.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "classic-burger" } },
    update: {
      name: "Classic Burger",
      categoryId: burgers.id,
      basePriceCents: 5000,
      isActive: true,
      isFeatured: true,
    },
    create: {
      tenantId: tenant.id,
      categoryId: burgers.id,
      name: "Classic Burger",
      slug: "classic-burger",
      description: "Beef patty, cheese, tomato, lettuce, and sauce.",
      basePriceCents: 5000,
      isActive: true,
      isFeatured: true,
      prepTimeMin: 10,
    },
    select: { id: true },
  });

  await prisma.product.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "cola-350" } },
    update: {
      name: "Cola 350ml",
      categoryId: drinks.id,
      basePriceCents: 1500,
      isActive: true,
    },
    create: {
      tenantId: tenant.id,
      categoryId: drinks.id,
      name: "Cola 350ml",
      slug: "cola-350",
      description: "Cold drink.",
      basePriceCents: 1500,
      isActive: true,
      prepTimeMin: 0,
    },
  });

  // =========================
  // 7) Attach option groups to product (tenant-safe)
  // =========================
  await prisma.productOptionGroup.upsert({
    where: {
      tenantId_productId_groupId: {
        tenantId: tenant.id,
        productId: classicBurger.id,
        groupId: ingredients.id,
      },
    },
    update: { sortOrder: 1 },
    create: {
      tenantId: tenant.id,
      productId: classicBurger.id,
      groupId: ingredients.id,
      sortOrder: 1,
    },
  });

  await prisma.productOptionGroup.upsert({
    where: {
      tenantId_productId_groupId: {
        tenantId: tenant.id,
        productId: classicBurger.id,
        groupId: extras.id,
      },
    },
    update: { sortOrder: 2 },
    create: {
      tenantId: tenant.id,
      productId: classicBurger.id,
      groupId: extras.id,
      sortOrder: 2,
    },
  });

  console.log("✅ Seeded user:", user);
  console.log("🔑 Password:", password);
  console.log(`🏪 Seeded tenant: ${tenant.slug}`);
  console.log("ℹ️ Tip: set SEED_EMAIL and SEED_PASSWORD in your .env.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });