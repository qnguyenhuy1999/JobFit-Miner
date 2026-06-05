import path from "path";
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not configured");

  // Resolve file: relative paths to absolute so libsql finds the DB regardless of CWD
  const resolvedUrl = dbUrl.startsWith("file:./")
    ? `file:${path.resolve(dbUrl.slice(7))}`
    : dbUrl;

  const adapter = new PrismaLibSql({ url: resolvedUrl });
  return new PrismaClient({ adapter } as never);
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
