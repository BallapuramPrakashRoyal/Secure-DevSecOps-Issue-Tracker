const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const { JWT_SECRET } = require('../src/lib/env');

const rand = () => Math.random().toString(36).slice(2, 10);

async function cleanup() {
  await prisma.auditLog.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.user.deleteMany();
}

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe('Auth', () => {
  const email = `user_${rand()}@test.local`;
  const password = 'StrongPass123!';

  test('1. Successful registration', async () => {
    const res = await request(app).post('/api/auth/register').send({ email, password, name: 'Test User' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  test('2. Successful login', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('3. Invalid login', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('4. Protected endpoint without JWT', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('5. Expired/invalid JWT', async () => {
    const badToken = jwt.sign({ sub: 'x' }, JWT_SECRET, { expiresIn: '-1s' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);

    const garbage = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(garbage.status).toBe(401);
  });
});

describe('RBAC and issue workflows', () => {
  let adminToken, devToken, viewerToken, adminUser, devUser, viewerUser, otherViewerUser;

  beforeAll(async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Password123!', 10);

    adminUser = await prisma.user.create({ data: { email: `admin_${rand()}@t.local`, passwordHash: hash, name: 'Admin', role: 'ADMIN' } });
    devUser = await prisma.user.create({ data: { email: `dev_${rand()}@t.local`, passwordHash: hash, name: 'Dev', role: 'DEVELOPER' } });
    viewerUser = await prisma.user.create({ data: { email: `viewer_${rand()}@t.local`, passwordHash: hash, name: 'Viewer', role: 'VIEWER' } });
    otherViewerUser = await prisma.user.create({ data: { email: `viewer2_${rand()}@t.local`, passwordHash: hash, name: 'Viewer2', role: 'VIEWER' } });

    adminToken = jwt.sign({ sub: adminUser.id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
    devToken = jwt.sign({ sub: devUser.id, role: 'DEVELOPER' }, JWT_SECRET, { expiresIn: '1h' });
    viewerToken = jwt.sign({ sub: viewerUser.id, role: 'VIEWER' }, JWT_SECRET, { expiresIn: '1h' });
  });

  test('6. Viewer attempting unauthorized modification (create issue)', async () => {
    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ title: 'Should fail', description: 'x', severity: 'LOW', priority: 'LOW', category: 'BUG' });
    expect(res.status).toBe(403);
  });

  test('7. Developer attempting admin operation (create user)', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ email: `nope_${rand()}@t.local`, password: 'Password123!', name: 'Nope', role: 'VIEWER' });
    expect(res.status).toBe(403);
  });

  let createdIssueId;

  test('8. Authorized issue creation', async () => {
    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ title: 'Real issue', description: 'A real bug', severity: 'HIGH', priority: 'HIGH', category: 'BUG' });
    expect(res.status).toBe(201);
    expect(res.body.issue.id).toBeDefined();
    createdIssueId = res.body.issue.id;
  });

  test('9. IDOR/BOLA protection: viewer cannot change another user role via crafted request', async () => {
    const res = await request(app)
      .patch(`/api/users/${otherViewerUser.id}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ role: 'ADMIN' });
    // Blocked by RBAC before ownership is even considered.
    expect(res.status).toBe(403);

    // Even a developer (non-admin) cannot escalate another account's role.
    const res2 = await request(app)
      .patch(`/api/users/${otherViewerUser.id}`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ role: 'ADMIN' });
    expect(res2.status).toBe(403);

    // Confirm role was never changed.
    const check = await prisma.user.findUnique({ where: { id: otherViewerUser.id } });
    expect(check.role).toBe('VIEWER');
  });

  test('10. Input validation failure', async () => {
    const res = await request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ title: '', description: 'x', severity: 'NOT_A_SEVERITY', priority: 'LOW', category: 'BUG' });
    expect(res.status).toBe(400);
  });

  test('Admin can update issue status and it is audit-logged', async () => {
    const res = await request(app)
      .patch(`/api/issues/${createdIssueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED' });
    expect(res.status).toBe(200);
    expect(res.body.issue.status).toBe('RESOLVED');

    const logs = await prisma.auditLog.findMany({ where: { entityId: createdIssueId, action: 'ISSUE_UPDATED' } });
    expect(logs.length).toBeGreaterThan(0);
  });

  test('Viewer can read issues but not delete', async () => {
    const list = await request(app).get('/api/issues').set('Authorization', `Bearer ${viewerToken}`);
    expect(list.status).toBe(200);

    const del = await request(app).delete(`/api/issues/${createdIssueId}`).set('Authorization', `Bearer ${viewerToken}`);
    expect(del.status).toBe(403);
  });
});
