-- CreateEnum
CREATE TYPE "TeamAssignment" AS ENUM ('TEAM_A', 'TEAM_B');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "teamAssignment" "TeamAssignment",
ADD COLUMN "assignedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_teamAssignment_dueDate_idx" ON "Order"("teamAssignment", "dueDate");

-- CreateIndex
CREATE INDEX "Order_assignedAt_idx" ON "Order"("assignedAt");
