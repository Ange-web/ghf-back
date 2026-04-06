// src/routes/events.js
const router = require('express').Router();
const { authenticate, requireAdmin, optionalAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const ctrl = require('../controllers/eventController');

router.get('/', optionalAuth, ctrl.listEvents);
router.get('/:id', ctrl.getEvent);
router.post('/', authenticate, requireAdmin, validate(schemas.event), ctrl.createEvent);
router.put('/:id', authenticate, requireAdmin, ctrl.updateEvent);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteEvent);

module.exports = router;
