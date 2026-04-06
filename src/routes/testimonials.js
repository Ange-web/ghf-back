// src/routes/testimonials.js
const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const ctrl = require('../controllers/testimonialController');

router.get('/', ctrl.listTestimonials);
router.post('/', authenticate, validate(schemas.testimonial), ctrl.createTestimonial);
router.patch('/:id/publish', authenticate, requireAdmin, ctrl.togglePublish);

module.exports = router;
