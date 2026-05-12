-- AlterTable
ALTER TABLE "change_requests" ADD COLUMN     "assignee_id" TEXT;

-- CreateIndex
CREATE INDEX "change_requests_assignee_id_status_idx" ON "change_requests"("assignee_id", "status");

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
