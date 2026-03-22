CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "base_currency" VARCHAR(100) NOT NULL DEFAULT 'USD',
    "quote_currency" VARCHAR(100) NOT NULL DEFAULT 'VES',
    "rate" DECIMAL(14,6) NOT NULL,
    "source" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exchange_rates_base_currency_quote_currency_is_active_idx"
    ON "exchange_rates"("base_currency", "quote_currency", "is_active");

CREATE INDEX "exchange_rates_effective_at_idx"
    ON "exchange_rates"("effective_at");

CREATE UNIQUE INDEX "exchange_rates_one_active_pair_idx"
    ON "exchange_rates"("base_currency", "quote_currency")
    WHERE "is_active" = true;
