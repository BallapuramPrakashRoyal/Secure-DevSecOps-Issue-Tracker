/* eslint-disable no-console */
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

// Demo credentials — documented here and in the README. These are for local
// development / demo purposes only and must never be used in production.
const DEMO_USERS = [
  { email: 'admin@demo.local', password: 'AdminPass123!', name: 'Ava Admin', role: 'ADMIN' },
  { email: 'developer@demo.local', password: 'DevPass123!', name: 'Dev Developer', role: 'DEVELOPER' },
  { email: 'viewer@demo.local', password: 'ViewerPass123!', name: 'Vic Viewer', role: 'VIEWER' },
];

async function main() {
  console.log('Seeding database...');

  const created = {};
  for (const u of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, passwordHash, name: u.name, role: u.role },
    });
    created[u.role] = user;
    console.log(`  - ${u.role}: ${u.email}`);
  }

  const issueCount = await prisma.issue.count();
  if (issueCount === 0) {
    await prisma.issue.createMany({
      data: [
        {
          title: 'SQL injection risk in legacy search endpoint',
          description: 'Legacy /search endpoint concatenates raw input; needs parameterized query audit.',
          severity: 'CRITICAL',
          priority: 'URGENT',
          status: 'OPEN',
          category: 'SECURITY',
          reporterId: created.ADMIN.id,
          assigneeId: created.DEVELOPER.id,
        },
        {
          title: 'Dashboard chart flickers on resize',
          description: 'Minor UI bug when resizing browser window on the dashboard page.',
          severity: 'LOW',
          priority: 'LOW',
          status: 'OPEN',
          category: 'BUG',
          reporterId: created.VIEWER.id,
        },
        {
          title: 'Add CSV export for issues list',
          description: 'Feature request to export the current filtered issue list to CSV.',
          severity: 'MEDIUM',
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          category: 'FEATURE',
          reporterId: created.DEVELOPER.id,
          assigneeId: created.DEVELOPER.id,
        },
        {
          title: 'Slow query on issues list with large datasets',
          description: 'Query time degrades past 10k issues; needs index review.',
          severity: 'HIGH',
          priority: 'HIGH',
          status: 'RESOLVED',
          category: 'PERFORMANCE',
          reporterId: created.ADMIN.id,
          assigneeId: created.DEVELOPER.id,
        },
      ],
    });
    console.log('  - Seeded 4 sample issues');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
