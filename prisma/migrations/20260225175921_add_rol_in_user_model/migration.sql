-- CreateEnum
CREATE TYPE "Roles" AS ENUM ('CUSTOMER', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "rol" "Roles" NOT NULL DEFAULT 'CUSTOMER';
