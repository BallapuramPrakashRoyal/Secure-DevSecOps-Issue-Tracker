const express = require('express');
const {
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
  assignIssue,
  getDashboardStats,
} = require('../controllers/issuesController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createIssueSchema,
  updateIssueSchema,
  assignIssueSchema,
  idParamSchema,
  issueQuerySchema,
} = require('../validation/schemas');

const router = express.Router();

router.use(requireAuth);

// All authenticated roles (ADMIN, DEVELOPER, VIEWER) can read.
router.get('/', validate(issueQuerySchema, 'query'), listIssues);
router.get('/stats', getDashboardStats);
router.get('/:id', validate(idParamSchema, 'params'), getIssue);

// Only ADMIN and DEVELOPER can create/modify. VIEWER is blocked here even
// if it were to call the API directly, regardless of frontend routing.
router.post('/', requireRole('ADMIN', 'DEVELOPER'), validate(createIssueSchema), createIssue);
router.patch(
  '/:id',
  requireRole('ADMIN', 'DEVELOPER'),
  validate(idParamSchema, 'params'),
  validate(updateIssueSchema),
  updateIssue
);
router.post(
  '/:id/assign',
  requireRole('ADMIN', 'DEVELOPER'),
  validate(idParamSchema, 'params'),
  validate(assignIssueSchema),
  assignIssue
);

// Deletion restricted to ADMIN — developers can update/triage but not remove records.
router.delete('/:id', requireRole('ADMIN'), validate(idParamSchema, 'params'), deleteIssue);

module.exports = router;
