const express = require('express');
const { listUsers, createUser, updateUserRole, deleteUser } = require('../controllers/usersController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createUserSchema, updateUserRoleSchema, idParamSchema } = require('../validation/schemas');

const router = express.Router();

// Every route below is ADMIN-only. Enforced server-side, not just hidden in the UI.
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', listUsers);
router.post('/', validate(createUserSchema), createUser);
router.patch('/:id', validate(idParamSchema, 'params'), validate(updateUserRoleSchema), updateUserRole);
router.delete('/:id', validate(idParamSchema, 'params'), deleteUser);

module.exports = router;
