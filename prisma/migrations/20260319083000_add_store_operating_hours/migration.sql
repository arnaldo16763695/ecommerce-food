CREATE TABLE "store_operating_hours" (
  "id" TEXT NOT NULL,
  "store_settings_id" TEXT NOT NULL,
  "day_of_week" INTEGER NOT NULL,
  "opens_at" VARCHAR(5) NOT NULL,
  "closes_at" VARCHAR(5) NOT NULL,
  "is_enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "store_operating_hours_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "store_operating_hours_store_settings_id_day_of_week_key"
ON "store_operating_hours"("store_settings_id", "day_of_week");

ALTER TABLE "store_operating_hours"
ADD CONSTRAINT "store_operating_hours_store_settings_id_fkey"
FOREIGN KEY ("store_settings_id") REFERENCES "store_settings"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
