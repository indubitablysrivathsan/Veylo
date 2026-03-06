const { PrismaClient } = require("@prisma/client");

try {
  prisma = new PrismaClient();
  console.log("[DB] Connected to PostgreSQL via Prisma");
} catch (err) {
  console.error("[DB] Prisma failed, falling back to in-memory DB", err);
  prisma = createInMemoryClient();
}

module.exports = prisma;