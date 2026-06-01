const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  // Log slow queries in development
  log: process.env.NODE_ENV !== 'production'
    ? [{ emit: 'event', level: 'query' }]
    : [],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Log slow queries (>500ms) in dev to account for remote Supabase latency
if (process.env.NODE_ENV !== 'production') {
  prisma.$on('query', (e) => {
    if (e.duration > 500) {
      console.warn(`⚠️ Slow query (${e.duration}ms): ${e.query.substring(0, 120)}...`);
    }
  });
}

// Eagerly connect so first requests aren't slow
prisma.$connect()
  .then(() => console.log('✅ Prisma connected to database'))
  .catch((err) => console.error('❌ Prisma connection failed:', err));

module.exports = prisma;
