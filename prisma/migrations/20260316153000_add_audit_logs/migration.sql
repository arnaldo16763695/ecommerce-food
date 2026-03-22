-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_role" "Roles",
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" TEXT,
    "entity_label" VARCHAR(160),
    "summary" VARCHAR(240) NOT NULL,
    "route_path" VARCHAR(200),
    "method" VARCHAR(12),
    "ip_address" VARCHAR(100),
    "user_agent" VARCHAR(500),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_created_at_idx" ON "audit_logs"("entity_type", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
