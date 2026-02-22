import "dotenv/config";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function upsertOptionGroup(params: {
  name: string;
  minSelect: number;
  maxSelect: number;
  sortOrder?: number;
}) {
  const { name, minSelect, maxSelect, sortOrder = 0 } = params;

  const existing = await prisma.optionGroup.findFirst({
    where: { name },
    select: { id: true },
  });

  if (existing) {
    return prisma.optionGroup.update({
      where: { id: existing.id },
      data: { minSelect, maxSelect, sortOrder, isActive: true },
    });
  }

  return prisma.optionGroup.create({
    data: { name, minSelect, maxSelect, sortOrder, isActive: true },
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
    process.env.SEED_PASSWORD ?? randomBytes(12).toString("base64url"); // generates a strong one

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
  // 2) Seed categories
  // =========================
  const burgers = await prisma.category.upsert({
    where: { slug: "burgers" },
    update: { name: "Burgers", sortOrder: 1, isActive: true },
    create: { name: "Burgers", slug: "burgers", sortOrder: 1, isActive: true },
    select: { id: true },
  });

  const drinks = await prisma.category.upsert({
    where: { slug: "drinks" },
    update: { name: "Drinks", sortOrder: 2, isActive: true },
    create: { name: "Drinks", slug: "drinks", sortOrder: 2, isActive: true },
    select: { id: true },
  });

  // =========================
  // 3) Seed option groups + options
  // =========================
  const ingredients = await upsertOptionGroup({
    name: "Ingredients",
    minSelect: 0,
    maxSelect: 3,
    sortOrder: 1,
  });

  const extras = await upsertOptionGroup({
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
  // 4) Seed products
  // =========================
  const classicBurger = await prisma.product.upsert({
    where: { slug: "classic-burger" },
    update: {
      name: "Classic Burger",
      categoryId: burgers.id,
      basePriceCents: 5000,
      isActive: true,
      isFeatured: true,
    },
    create: {
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
    where: { slug: "cola-350" },
    update: {
      name: "Cola 350ml",
      categoryId: drinks.id,
      basePriceCents: 1500,
      isActive: true,
    },
    create: {
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
  // 5) Attach option groups to product
  // =========================
  await prisma.productOptionGroup.upsert({
    where: { productId_groupId: { productId: classicBurger.id, groupId: ingredients.id } },
    update: { sortOrder: 1 },
    create: { productId: classicBurger.id, groupId: ingredients.id, sortOrder: 1 },
  });

  await prisma.productOptionGroup.upsert({
    where: { productId_groupId: { productId: classicBurger.id, groupId: extras.id } },
    update: { sortOrder: 2 },
    create: { productId: classicBurger.id, groupId: extras.id, sortOrder: 2 },
  });

  console.log("✅ Seeded user:", user);
  console.log("🔑 Password:", password);
  console.log("✅ Seeded categories, products, and modifiers.");
  console.log("ℹ️ Tip: you can set SEED_EMAIL and SEED_PASSWORD in your .env.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
