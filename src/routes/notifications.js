// src/routes/notifications.js
const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.post('/subscribe', authenticate, ctrl.subscribe);
router.post('/send', authenticate, requireAdmin, ctrl.sendManual);

module.exports = router;
