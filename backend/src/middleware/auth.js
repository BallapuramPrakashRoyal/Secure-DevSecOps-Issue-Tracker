const { verifyToken } = require('../lib/jwt');
const prisma = require('../lib/prisma');

/**
 * Verifies the Authorization: Bearer <token> header, loads the current user
 * (to catch users deleted/role-changed since the token was issued), and
 * attaches req.user. Rejects missing, malformed, expired, or invalid tokens.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Server-side RBAC gate. Must be used AFTER requireAuth.
 * Usage: requireRole('ADMIN') or requireRole('ADMIN', 'DEVELOPER')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
