-- CreateTable
CREATE TABLE "Submission" (
    "id" SERIAL NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "problemSlug" TEXT NOT NULL,
    "problemTitle" TEXT NOT NULL,
    "problemDate" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "difficultyRating" TEXT,
    "adjustment" TEXT,
    "compressedSummary" TEXT NOT NULL,
    "codeUrl" TEXT,
    "codeFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Submission_discordUserId_createdAt_idx" ON "Submission"("discordUserId", "createdAt");
