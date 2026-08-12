const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().trim().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(128),
});

const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'DEVELOPER', 'VIEWER']),
});

const createUserSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(1).max(100),
  role: z.enum(['ADMIN', 'DEVELOPER', 'VIEWER']).default('VIEWER'),
});

const idParamSchema = z.object({
  id: z.string().uuid('Invalid id format'),
});

const createIssueSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  category: z.enum(['BUG', 'SECURITY', 'FEATURE', 'PERFORMANCE']),
  assigneeId: z.string().uuid().nullable().optional(),
});

const updateIssueSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(5000).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  category: z.enum(['BUG', 'SECURITY', 'FEATURE', 'PERFORMANCE']).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

const assignIssueSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
});

const issueQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  category: z.enum(['BUG', 'SECURITY', 'FEATURE', 'PERFORMANCE']).optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateUserRoleSchema,
  createUserSchema,
  idParamSchema,
  createIssueSchema,
  updateIssueSchema,
  assignIssueSchema,
  issueQuerySchema,
};
