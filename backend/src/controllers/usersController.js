const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { toPublicUser } = require('./authController');
const { recordAudit, getClientIp } = require('../services/auditService');

const SALT_ROUNDS = 12;

// All routes here are mounted behind requireAuth + requireRole('ADMIN').

async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    return res.status(200).json({ users: users.map(toPublicUser) });
  } catch (err) {
    return next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { email, password, name, role } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({ data: { email, passwordHash, name, role } });

    await recordAudit({
      actorUserId: req.user.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      metadata: { email, role, via: 'admin' },
      ipAddress: getClientIp(req),
    });

    return res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    return next(err);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.user.update({ where: { id }, data: { role } });

    await recordAudit({
      actorUserId: req.user.id,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: id,
      metadata: { from: target.role, to: role },
      ipAddress: getClientIp(req),
    });

    return res.status(200).json({ user: toPublicUser(updated) });
  } catch (err) {
    return next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    await prisma.user.delete({ where: { id } });

    await recordAudit({
      actorUserId: req.user.id,
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: id,
      metadata: { email: target.email },
      ipAddress: getClientIp(req),
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = { listUsers, createUser, updateUserRole, deleteUser };
