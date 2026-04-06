// src/routes/reservations.js
const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const ctrl = require('../controllers/reservationController');

router.post('/', authenticate, validate(schemas.reservation), ctrl.createReservation);
router.get('/my', authenticate, ctrl.getMyReservations);
router.delete('/:id', authenticate, ctrl.cancelReservation);
router.get('/', authenticate, requireAdmin, ctrl.listAll);
router.patch('/:id/status', authenticate, requireAdmin, ctrl.updateStatus);

module.exports = router;
