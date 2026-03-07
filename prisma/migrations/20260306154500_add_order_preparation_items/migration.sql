CREATE TABLE "order_preparation_items" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "order_item_id" TEXT NOT NULL,
  "is_prepared" BOOLEAN NOT NULL DEFAULT false,
  "prepared_at" TIMESTAMP(3),
  "prepared_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "order_preparation_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_preparation_items_order_item_id_key"
ON "order_preparation_items"("order_item_id");

CREATE INDEX "order_preparation_items_order_id_idx"
ON "order_preparation_items"("order_id");

CREATE INDEX "order_preparation_items_prepared_by_user_id_idx"
ON "order_preparation_items"("prepared_by_user_id");

CREATE INDEX "order_preparation_items_is_prepared_idx"
ON "order_preparation_items"("is_prepared");

ALTER TABLE "order_preparation_items"
ADD CONSTRAINT "order_preparation_items_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_preparation_items"
ADD CONSTRAINT "order_preparation_items_order_item_id_fkey"
FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_preparation_items"
ADD CONSTRAINT "order_preparation_items_prepared_by_user_id_fkey"
FOREIGN KEY ("prepared_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
