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

async function main() {
  const email = process.env.SEED_EMAIL ?? "demo@local.test";
  const password =
    process.env.SEED_PASSWORD ?? randomBytes(12).toString("base64url"); // genera una segura

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

  console.log("✅ Seeded user:", user);
  console.log("🔑 Password:", password);
  console.log("ℹ️ Tip: puedes definir SEED_EMAIL y SEED_PASSWORD en tu .env.local");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
