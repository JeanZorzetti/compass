-- CreateTable
CREATE TABLE "outreach_logs" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "community" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'responded',
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outreach_logs_createdAt_idx" ON "outreach_logs"("createdAt");
