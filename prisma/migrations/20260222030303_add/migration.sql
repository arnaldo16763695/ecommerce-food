/*
  Warnings:

  - A unique constraint covering the columns `[group_id,name]` on the table `options` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order_item_id,option_id]` on the table `order_item_options` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_id,sort_order]` on the table `product_images` will be added. If there are existing duplicate values, this will fail.
  - Made the column `order_number` on table `orders` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT', 'ABANDONED');

-- AlterTable
CREATE SEQUENCE orders_order_number_seq;
ALTER TABLE "orders" ALTER COLUMN "order_number" SET NOT NULL,
ALTER COLUMN "order_number" SET DEFAULT nextval('orders_order_number_seq');
ALTER SEQUENCE orders_order_number_seq OWNED BY "orders"."order_number";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "cover_image_url" TEXT;

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "guest_token" TEXT,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "product_id" TEXT,
    "line_key" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price_cents" INTEGER NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item_options" (
    "id" TEXT NOT NULL,
    "cart_item_id" TEXT NOT NULL,
    "option_id" TEXT,
    "group_name_snapshot" TEXT NOT NULL,
    "option_name_snapshot" TEXT NOT NULL,
    "price_delta_cents" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "cart_item_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carts_guest_token_key" ON "carts"("guest_token");

-- CreateIndex
CREATE INDEX "carts_user_id_status_idx" ON "carts"("user_id", "status");

-- CreateIndex
CREATE INDEX "carts_status_updated_at_idx" ON "carts"("status", "updated_at");

-- CreateIndex
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");

-- CreateIndex
CREATE INDEX "cart_items_product_id_idx" ON "cart_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_line_key_key" ON "cart_items"("cart_id", "line_key");

-- CreateIndex
CREATE INDEX "cart_item_options_cart_item_id_idx" ON "cart_item_options"("cart_item_id");

-- CreateIndex
CREATE INDEX "cart_item_options_option_id_idx" ON "cart_item_options"("option_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_options_cart_item_id_option_id_key" ON "cart_item_options"("cart_item_id", "option_id");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "categories_is_active_sort_order_idx" ON "categories"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "option_groups_is_active_sort_order_idx" ON "option_groups"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "options_group_id_is_active_idx" ON "options"("group_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "options_group_id_name_key" ON "options"("group_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "order_item_options_order_item_id_option_id_key" ON "order_item_options"("order_item_id", "option_id");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "orders_payment_status_created_at_idx" ON "orders"("payment_status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_images_product_id_sort_order_key" ON "product_images"("product_id", "sort_order");

-- CreateIndex
CREATE INDEX "product_option_groups_group_id_idx" ON "product_option_groups"("group_id");

-- CreateIndex
CREATE INDEX "products_is_active_is_featured_idx" ON "products"("is_active", "is_featured");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_options" ADD CONSTRAINT "cart_item_options_cart_item_id_fkey" FOREIGN KEY ("cart_item_id") REFERENCES "cart_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_options" ADD CONSTRAINT "cart_item_options_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
