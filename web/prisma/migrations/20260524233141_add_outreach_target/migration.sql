-- CreateTable
CREATE TABLE "outreach_targets" (
    "id" TEXT NOT NULL,
    "sub" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "ageDays" INTEGER NOT NULL DEFAULT 0,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "pushedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outreach_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outreach_targets_done_score_idx" ON "outreach_targets"("done", "score");
