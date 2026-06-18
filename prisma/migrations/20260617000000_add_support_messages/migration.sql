-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalate_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_messages_organization_id_created_at_idx" ON "support_messages"("organization_id", "created_at");
