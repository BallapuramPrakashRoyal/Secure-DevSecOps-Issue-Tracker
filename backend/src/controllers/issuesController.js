const prisma = require('../lib/prisma');
const { recordAudit, getClientIp } = require('../services/auditService');

const ISSUE_SELECT = {
  id: true,
  title: true,
  description: true,
  severity: true,
  priority: true,
  status: true,
  category: true,
  createdAt: true,
  updatedAt: true,
  reporter: { select: { id: true, name: true, email: true } },
  assignee: { select: { id: true, name: true, email: true } },
};

async function listIssues(req, res, next) {
  try {
    const { status, severity, category, search, page, pageSize } = req.query;

    const where = {
      ...(status && { status }),
      ...(severity && { severity }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        select: ISSUE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.issue.count({ where }),
    ]);

    return res.status(200).json({
      issues,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    return next(err);
  }
}

async function getIssue(req, res, next) {
  try {
    const issue = await prisma.issue.findUnique({ where: { id: req.params.id }, select: ISSUE_SELECT });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    return res.status(200).json({ issue });
  } catch (err) {
    return next(err);
  }
}

// ADMIN and DEVELOPER only (enforced by route middleware). VIEWER never
// reaches this handler even with a crafted direct API call.
async function createIssue(req, res, next) {
  try {
    const { title, description, severity, priority, category, assigneeId } = req.body;

    if (assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!assignee) return res.status(400).json({ error: 'Assignee does not exist' });
    }

    const issue = await prisma.issue.create({
      data: {
        title,
        description,
        severity,
        priority,
        category,
        reporterId: req.user.id,
        assigneeId: assigneeId || null,
      },
      select: ISSUE_SELECT,
    });

    await recordAudit({
      actorUserId: req.user.id,
      action: 'ISSUE_CREATED',
      entityType: 'Issue',
      entityId: issue.id,
      metadata: { title, severity, priority, category },
      ipAddress: getClientIp(req),
    });

    return res.status(201).json({ issue });
  } catch (err) {
    return next(err);
  }
}

async function updateIssue(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Issue not found' });

    if (req.body.assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: req.body.assigneeId } });
      if (!assignee) return res.status(400).json({ error: 'Assignee does not exist' });
    }

    const issue = await prisma.issue.update({ where: { id }, data: req.body, select: ISSUE_SELECT });

    await recordAudit({
      actorUserId: req.user.id,
      action: 'ISSUE_UPDATED',
      entityType: 'Issue',
      entityId: id,
      metadata: { changes: req.body },
      ipAddress: getClientIp(req),
    });

    return res.status(200).json({ issue });
  } catch (err) {
    return next(err);
  }
}

async function deleteIssue(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Issue not found' });

    await prisma.issue.delete({ where: { id } });

    await recordAudit({
      actorUserId: req.user.id,
      action: 'ISSUE_DELETED',
      entityType: 'Issue',
      entityId: id,
      metadata: { title: existing.title },
      ipAddress: getClientIp(req),
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function assignIssue(req, res, next) {
  try {
    const { id } = req.params;
    const { assigneeId } = req.body;

    const existing = await prisma.issue.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Issue not found' });

    if (assigneeId) {
      const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!assignee) return res.status(400).json({ error: 'Assignee does not exist' });
    }

    const issue = await prisma.issue.update({ where: { id }, data: { assigneeId }, select: ISSUE_SELECT });

    await recordAudit({
      actorUserId: req.user.id,
      action: 'ISSUE_ASSIGNED',
      entityType: 'Issue',
      entityId: id,
      metadata: { assigneeId },
      ipAddress: getClientIp(req),
    });

    return res.status(200).json({ issue });
  } catch (err) {
    return next(err);
  }
}

async function getDashboardStats(req, res, next) {
  try {
    const [total, open, critical, resolved, recent] = await Promise.all([
      prisma.issue.count(),
      prisma.issue.count({ where: { status: 'OPEN' } }),
      prisma.issue.count({ where: { severity: 'CRITICAL' } }),
      prisma.issue.count({ where: { status: 'RESOLVED' } }),
      prisma.issue.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: ISSUE_SELECT }),
    ]);
    return res.status(200).json({ total, open, critical, resolved, recent });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listIssues, getIssue, createIssue, updateIssue, deleteIssue, assignIssue, getDashboardStats };
