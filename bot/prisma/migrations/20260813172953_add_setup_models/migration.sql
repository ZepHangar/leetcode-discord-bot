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
