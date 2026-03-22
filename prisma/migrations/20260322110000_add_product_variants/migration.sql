CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_delta_cents" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "track_stock" BOOLEAN NOT NULL DEFAULT false,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "order_items"
ADD COLUMN "product_variant_id" TEXT,
ADD COLUMN "variant_name_snapshot" TEXT;

ALTER TABLE "cart_items"
ADD COLUMN "product_variant_id" TEXT,
ADD COLUMN "variant_name_snapshot" TEXT;

CREATE UNIQUE INDEX "product_variants_product_id_name_key" ON "product_variants"("product_id", "name");
CREATE INDEX "product_variants_product_id_sort_order_idx" ON "product_variants"("product_id", "sort_order");
CREATE INDEX "product_variants_product_id_is_active_sort_order_idx" ON "product_variants"("product_id", "is_active", "sort_order");
CREATE INDEX "product_variants_track_stock_stock_quantity_idx" ON "product_variants"("track_stock", "stock_quantity");
CREATE INDEX "order_items_product_variant_id_idx" ON "order_items"("product_variant_id");
CREATE INDEX "cart_items_product_variant_id_idx" ON "cart_items"("product_variant_id");

ALTER TABLE "product_variants"
ADD CONSTRAINT "product_variants_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_product_variant_id_fkey"
FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cart_items"
ADD CONSTRAINT "cart_items_product_variant_id_fkey"
FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
