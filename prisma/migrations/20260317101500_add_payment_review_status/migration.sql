CREATE TYPE "PaymentReviewStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "orders"
ADD COLUMN "payment_review_status" "PaymentReviewStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN "payment_review_notes" VARCHAR(1000),
ADD COLUMN "payment_reviewed_at" TIMESTAMP(3),
ADD COLUMN "payment_reviewed_by_user_id" TEXT;

ALTER TABLE "orders"
ADD CONSTRAINT "orders_payment_reviewed_by_user_id_fkey"
FOREIGN KEY ("payment_reviewed_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "orders_payment_review_status_created_at_idx"
ON "orders"("payment_review_status", "created_at");
