ALTER TABLE "orders"
ADD COLUMN "assigned_preparer_id" TEXT,
ADD COLUMN "assigned_at" TIMESTAMP(3);

ALTER TABLE "orders"
ADD CONSTRAINT "orders_assigned_preparer_id_fkey"
FOREIGN KEY ("assigned_preparer_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "orders_assigned_preparer_id_idx" ON "orders"("assigned_preparer_id");
