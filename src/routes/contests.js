// src/routes/contests.js
const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const ctrl = require('../controllers/contestController');

router.get('/', ctrl.listContests);
router.get('/:id', ctrl.getContest);
router.post('/:id/participate', authenticate, validate(schemas.contestParticipation), ctrl.participate);
router.post('/', authenticate, requireAdmin, validate(schemas.contest), ctrl.createContest);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteContest);

module.exports = router;
