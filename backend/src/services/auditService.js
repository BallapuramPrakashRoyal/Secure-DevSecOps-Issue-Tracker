const prisma = require('../lib/prisma');

/**
 * Records a security-relevant event. Never throws to the caller —
 * audit logging failures must not break the primary request flow,
 * but they are logged server-side for investigation.
 */
async function recordAudit({ actorUserId = null, action, entityType, entityId = null, metadata = null, ipAddress = null }) {
  try {
    await prisma.auditLog.create({
      data: { actorUserId, action, entityType, entityId, metadata: metadata ?? undefined, ipAddress },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write audit log:', err.message);
  }
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || null;
}

module.exports = { recordAudit, getClientIp };
