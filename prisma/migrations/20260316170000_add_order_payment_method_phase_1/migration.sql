CREATE TYPE "PaymentMethod" AS ENUM ('MOBILE_PAYMENT', 'BANK_TRANSFER');

ALTER TABLE "orders"
ADD COLUMN "payment_method" "PaymentMethod",
ADD COLUMN "payment_reference" VARCHAR(120),
ADD COLUMN "payment_proof_url" VARCHAR(500),
ADD COLUMN "payment_proof_path" VARCHAR(500);
