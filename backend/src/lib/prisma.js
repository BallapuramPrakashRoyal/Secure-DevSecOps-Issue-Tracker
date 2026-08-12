const { PrismaClient } = require('@prisma/client');

// Reuse a single PrismaClient instance to avoid exhausting DB connections,
// especially important with test runners / hot-reload in dev.
const globalForPrisma = global;

const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
