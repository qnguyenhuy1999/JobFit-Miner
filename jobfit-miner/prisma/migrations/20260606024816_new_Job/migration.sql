/*
  Warnings:

  - You are about to drop the column `analyzedAt` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `benefits` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `concerns` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `detailText` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `expectationFit` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `fitLevel` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `matchedSkills` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `missingSkills` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `salary` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `seniorityMatch` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `socialInsurance` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Job` table. All the data in the column will be lost.
  - You are about to drop the column `workMode` on the `Job` table. All the data in the column will be lost.

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
    "score" INTEGER,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Job" ("company", "createdAt", "description", "id", "location", "reason", "score", "site", "title", "url") SELECT "company", "createdAt", "description", "id", "location", "reason", "score", "site", "title", "url" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE UNIQUE INDEX "Job_url_key" ON "Job"("url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
