// src/routes/admin.js
const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

// Toutes les routes admin nécessitent authentification + rôle ADMIN
router.use(authenticate, requireAdmin);

router.get('/stats', ctrl.getStats);
router.get('/users', ctrl.listUsers);
router.patch('/users/:id/role', ctrl.updateUserRole);
router.delete('/users/:id', ctrl.deleteUser);

module.exports = router;
