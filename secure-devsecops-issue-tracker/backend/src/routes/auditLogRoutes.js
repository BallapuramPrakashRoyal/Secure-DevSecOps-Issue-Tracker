const express = require('express');
const { listAuditLogs } = require('../controllers/auditLogsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));
router.get('/', listAuditLogs);

module.exports = router;
