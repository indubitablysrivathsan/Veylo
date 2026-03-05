/**
 * backend/db/prismaClient.js
 * ────────────────────────────
 * Smart database client — tries Prisma first, falls back to in-memory store.
 * This allows the app to work without PostgreSQL or SQLite.
 */

let prisma;

// ── In-Memory Store ────────────────────────────
const inMemoryDb = {
  users: [],
  jobs: [],
  validationReports: [],
  reputations: {},
  badges: [],
  slashRecords: {},
  _nextUserId: 1,
  _nextJobId: 1,
  _nextReportId: 1,
  _nextBadgeId: 1,
};

/** Create an in-memory Prisma-like API */
function createInMemoryClient() {
  console.log("[DB] Using in-memory store (no database required)");

  return {
    user: {
      create: async ({ data }) => {
        const user = { id: inMemoryDb._nextUserId++, ...data, createdAt: data.createdAt || new Date() };
        inMemoryDb.users.push(user);
        return user;
      },
      findUnique: async ({ where }) => {
        if (where.id) return inMemoryDb.users.find(u => u.id === where.id) || null;
        if (where.email) return inMemoryDb.users.find(u => u.email === where.email) || null;
        return null;
      },
      update: async ({ where, data }) => {
        const idx = inMemoryDb.users.findIndex(u => u.id === where.id);
        if (idx === -1) return null;
        inMemoryDb.users[idx] = { ...inMemoryDb.users[idx], ...data };
        return inMemoryDb.users[idx];
      },
    },
    job: {
      create: async ({ data }) => {
        const job = { id: inMemoryDb._nextJobId++, ...data, createdAt: data.createdAt || new Date() };
        inMemoryDb.jobs.push(job);
        return job;
      },
      findMany: async ({ where, orderBy } = {}) => {
        let jobs = [...inMemoryDb.jobs];
        if (where?.state) jobs = jobs.filter(j => j.state === where.state);
        if (orderBy?.createdAt === "desc") jobs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return jobs;
      },
      findUnique: async ({ where }) => {
        return inMemoryDb.jobs.find(j => j.id === where.id) || null;
      },
      update: async ({ where, data }) => {
        const idx = inMemoryDb.jobs.findIndex(j => j.id === where.id);
        if (idx === -1) return null;
        inMemoryDb.jobs[idx] = { ...inMemoryDb.jobs[idx], ...data };
        return inMemoryDb.jobs[idx];
      },
    },
    validationReport: {
      create: async ({ data }) => {
        const report = { id: inMemoryDb._nextReportId++, ...data, createdAt: data.createdAt || new Date() };
        inMemoryDb.validationReports.push(report);
        return report;
      },
      findFirst: async ({ where, orderBy } = {}) => {
        return inMemoryDb.validationReports.find(r => r.jobId === where.jobId) || null;
      },
      findUnique: async ({ where }) => {
        if (where.jobId) return inMemoryDb.validationReports.find(r => r.jobId === where.jobId) || null;
        return inMemoryDb.validationReports.find(r => r.id === where.id) || null;
      },
      upsert: async ({ where, update, create }) => {
        const idx = inMemoryDb.validationReports.findIndex(r => r.jobId === where.jobId);
        if (idx >= 0) {
          inMemoryDb.validationReports[idx] = { ...inMemoryDb.validationReports[idx], ...update };
          return inMemoryDb.validationReports[idx];
        }
        const report = { id: inMemoryDb._nextReportId++, ...create, createdAt: new Date() };
        inMemoryDb.validationReports.push(report);
        return report;
      },
    },
    reputation: {
      findUnique: async ({ where }) => {
        return inMemoryDb.reputations[where.address] || null;
      },
      upsert: async ({ where, update, create }) => {
        if (inMemoryDb.reputations[where.address]) {
          inMemoryDb.reputations[where.address] = { ...inMemoryDb.reputations[where.address], ...update, updatedAt: new Date() };
        } else {
          inMemoryDb.reputations[where.address] = { ...create, updatedAt: new Date() };
        }
        return inMemoryDb.reputations[where.address];
      },
    },
    badge: {
      findMany: async ({ where }) => {
        return inMemoryDb.badges.filter(b => b.address === where.address);
      },
      create: async ({ data }) => {
        const badge = { id: inMemoryDb._nextBadgeId++, ...data, awardedAt: data.awardedAt || new Date() };
        inMemoryDb.badges.push(badge);
        return badge;
      },
    },
    slashRecord: {
      findUnique: async ({ where }) => {
        return inMemoryDb.slashRecords[where.address] || null;
      },
      upsert: async ({ where, update, create }) => {
        if (inMemoryDb.slashRecords[where.address]) {
          inMemoryDb.slashRecords[where.address] = { ...inMemoryDb.slashRecords[where.address], ...update };
        } else {
          inMemoryDb.slashRecords[where.address] = { ...create };
        }
        return inMemoryDb.slashRecords[where.address];
      },
    },
    $connect: async () => { },
  };
}

// ── Initialize ─────────────────────────────────
// Using in-memory store — Prisma generate has issues on OneDrive paths.
// To use a real database, run: npx prisma generate && npx prisma db push
// Then replace this with: const prisma = new PrismaClient()
prisma = createInMemoryClient();

module.exports = prisma;