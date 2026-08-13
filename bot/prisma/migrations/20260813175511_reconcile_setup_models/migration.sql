/*
  Warnings:

  - You are about to drop the `ExampleCounter` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "ExampleCounter";

-- CreateTable
CREATE TABLE "UserSetup" (
    "discordUserId" TEXT NOT NULL,
    "timezone" TEXT,
    "sendTime" TEXT,
    "aiPrompt" TEXT,
    "lastSentDate" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSetup_pkey" PRIMARY KEY ("discordUserId")
);

-- CreateTable
CREATE TABLE "GuildSetup" (
    "guildId" TEXT NOT NULL,
    "channelId" TEXT,
    "timezone" TEXT,
    "sendTime" TEXT,
    "aiPrompt" TEXT,
    "lastSentDate" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildSetup_pkey" PRIMARY KEY ("guildId")
);
