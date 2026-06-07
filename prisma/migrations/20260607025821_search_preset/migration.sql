-- CreateTable
CREATE TABLE "SearchPreset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "location" TEXT,
    "techStack" TEXT,
    "expectations" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
