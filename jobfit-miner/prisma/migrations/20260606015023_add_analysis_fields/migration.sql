/*
  Warnings:

  - Added the required column `updatedAt` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "site" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "location" TEXT,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "detailText" TEXT,
    "score" INTEGER,
    "fitLevel" TEXT,
    "reason" TEXT,
    "matchedSkills" TEXT,
    "missingSkills" TEXT,
    "benefits" TEXT,
    "concerns" TEXT,
    "workMode" TEXT,
    "salary" TEXT,
    "socialInsurance" TEXT,
    "seniorityMatch" TEXT,
    "expectationFit" TEXT,
    "analyzedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Job" ("company", "createdAt", "description", "id", "location", "reason", "score", "site", "title", "url") SELECT "company", "createdAt", "description", "id", "location", "reason", "score", "site", "title", "url" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE UNIQUE INDEX "Job_url_key" ON "Job"("url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
