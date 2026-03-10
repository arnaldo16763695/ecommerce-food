CREATE TABLE "store_settings" (
    "id" TEXT NOT NULL,
    "singleton_key" TEXT NOT NULL DEFAULT 'default',
    "delivery_fee_cents" INTEGER NOT NULL DEFAULT 1000,
    "free_delivery_min_cents" INTEGER NOT NULL DEFAULT 10000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_settings_singleton_key_key" ON "store_settings"("singleton_key");
