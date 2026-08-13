-- CreateTable
CREATE TABLE "ExampleCounter" (
    "guildId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExampleCounter_pkey" PRIMARY KEY ("guildId")
);
