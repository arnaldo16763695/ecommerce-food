ALTER TABLE "store_settings"
ADD COLUMN "payment_mobile_bank" VARCHAR(120),
ADD COLUMN "payment_mobile_phone" VARCHAR(40),
ADD COLUMN "payment_mobile_id" VARCHAR(40),
ADD COLUMN "payment_transfer_bank" VARCHAR(120),
ADD COLUMN "payment_transfer_account_type" VARCHAR(40),
ADD COLUMN "payment_transfer_account_number" VARCHAR(80),
ADD COLUMN "payment_transfer_id" VARCHAR(40),
ADD COLUMN "payment_beneficiary_name" VARCHAR(160);
