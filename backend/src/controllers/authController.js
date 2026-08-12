const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { signToken } = require('../lib/jwt');
const { recordAudit, getClientIp } = require('../services/auditService');

const SALT_ROUNDS = 12;

function toPublicUser(user) {
  const { passwordHash, ...rest } = user;
  return rest;
}

async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // First registered user becomes ADMIN so the system is bootstrappable;
    // all subsequent self-registrations default to VIEWER (least privilege).
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'VIEWER';

    const user = await prisma.user.create({
      data: { email, passwordHash, name, role },
    });

    await recordAudit({
      actorUserId: user.id,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      metadata: { email, role, via: 'self-registration' },
      ipAddress: getClientIp(req),
    });

    const token = signToken({ sub: user.id, role: user.role });
    return res.status(201).json({ user: toPublicUser(user), token });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const ipAddress = getClientIp(req);

    const user = await prisma.user.findUnique({ where: { email } });

    // Use a generic error and constant-shape response so we don't leak
    // whether the email exists (prevents user enumeration).
    if (!user) {
      await recordAudit({ action: 'LOGIN_FAILURE', entityType: 'User', metadata: { email }, ipAddress });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await recordAudit({
        actorUserId: user.id,
        action: 'LOGIN_FAILURE',
        entityType: 'User',
        entityId: user.id,
        metadata: { email },
        ipAddress,
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await recordAudit({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
    });

    const token = signToken({ sub: user.id, role: user.role });
    return res.status(200).json({ user: toPublicUser(user), token });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ user: toPublicUser(user) });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, me, toPublicUser };
