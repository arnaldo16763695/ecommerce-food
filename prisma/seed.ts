import "dotenv/config";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, Roles } from "../app/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function upsertUser(params: {
  email: string;
  name: string;
  role: Roles;
  passwordHash: string;
}) {
  const { email, name, role, passwordHash } = params;

  return prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash },
    create: { email, name, role, passwordHash },
    select: { id: true, email: true, role: true },
  });
}

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

async function seedExchangeRate() {
  const rateValue = Number(process.env.SEED_USD_VES_RATE ?? "89.50");
  if (!Number.isFinite(rateValue) || rateValue <= 0) {
    throw new Error("SEED_USD_VES_RATE must be a positive number");
  }

  const activeRate = await prisma.exchangeRate.findFirst({
    where: {
      baseCurrency: "USD",
      quoteCurrency: "VES",
      isActive: true,
    },
    orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  if (activeRate) {
    await prisma.exchangeRate.update({
      where: { id: activeRate.id },
      data: {
        rate: rateValue,
        source: "BCV",
        effectiveAt: new Date(),
        isActive: true,
      },
    });
  } else {
    await prisma.exchangeRate.create({
      data: {
        baseCurrency: "USD",
        quoteCurrency: "VES",
        rate: rateValue,
        source: "BCV",
        isActive: true,
        effectiveAt: new Date(),
      },
    });
  }
}

async function main() {
  // =========================
  // 1) Seed users (Credentials)
  // =========================
  const customerEmail = process.env.SEED_EMAIL ?? "demo@local.test";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@local.test";
  const preparerEmail = process.env.SEED_PREPARER_EMAIL ?? "preparer@local.test";
  const password =
    process.env.SEED_PASSWORD ?? randomBytes(12).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);

  const users = await Promise.all([
    upsertUser({
      email: customerEmail,
      name: "Demo Customer",
      role: "CUSTOMER",
      passwordHash,
    }),
    upsertUser({
      email: adminEmail,
      name: "Demo Admin",
      role: "ADMIN",
      passwordHash,
    }),
    upsertUser({
      email: preparerEmail,
      name: "Demo Preparer",
      role: "PREPARER",
      passwordHash,
    }),
  ]);

  // =========================
  // 2) Seed exchange rate
  // =========================
  await seedExchangeRate();

  // =========================
  // 3) Seed categories
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
  // 4) Seed option groups + options
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
  // 5) Seed products
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
  // 6) Attach option groups to product
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

  console.log("Seeded users:", users);
  console.log("Seed password:", password);
  console.log("Seeded categories, products, modifiers, and exchange rate.");
  console.log(
    "Tip: set SEED_EMAIL, SEED_ADMIN_EMAIL, SEED_PREPARER_EMAIL, SEED_PASSWORD, and SEED_USD_VES_RATE in .env.local",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
