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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CandidateProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "summary" TEXT NOT NULL,
    "sourceName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CandidateProfile" ("createdAt", "id", "sourceName", "summary", "updatedAt") SELECT "createdAt", "id", "sourceName", "summary", "updatedAt" FROM "CandidateProfile";
DROP TABLE "CandidateProfile";
ALTER TABLE "new_CandidateProfile" RENAME TO "CandidateProfile";
CREATE TABLE "new_Job" (
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
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Job" ("company", "createdAt", "description", "id", "location", "reason", "score", "site", "title", "url") SELECT "company", "createdAt", "description", "id", "location", "reason", "score", "site", "title", "url" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE UNIQUE INDEX "Job_url_key" ON "Job"("url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
