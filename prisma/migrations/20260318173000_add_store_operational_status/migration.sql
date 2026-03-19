ALTER TABLE "store_settings"
ADD COLUMN "is_store_open" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "store_status_message" VARCHAR(250),
ADD COLUMN "store_status_changed_at" TIMESTAMP(3);
