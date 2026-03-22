ALTER TABLE "products"
ADD COLUMN "track_stock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "stock_quantity" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "products_track_stock_stock_quantity_idx"
ON "products"("track_stock", "stock_quantity");
