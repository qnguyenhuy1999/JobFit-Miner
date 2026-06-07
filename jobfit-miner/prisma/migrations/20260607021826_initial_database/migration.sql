-- CreateTable
CREATE TABLE "Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "site" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "salary" TEXT,
    "workMode" TEXT,
    "benefits" TEXT,
    "score" INTEGER,
    "fitLevel" TEXT,
    "reason" TEXT,
    "matchedSkills" TEXT,
    "missingSkills" TEXT,
    "expectationMatches" TEXT,
    "redFlags" TEXT,
    "detectedTechStack" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MiningRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "keywords" TEXT NOT NULL,
    "site" TEXT NOT NULL,
    "location" TEXT,
    "filters" TEXT,
    "found" INTEGER NOT NULL DEFAULT 0,
    "scored" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "summary" TEXT NOT NULL,
    "sourceName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_url_key" ON "Job"("url");
