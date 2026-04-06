// src/routes/auth.js
const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const ctrl = require('../controllers/authController');

router.post('/register', validate(schemas.register), ctrl.register);
router.post('/login', validate(schemas.login), ctrl.login);
router.get('/me', authenticate, ctrl.getMe);
router.put('/me', authenticate, ctrl.updateProfile);
router.put('/password', authenticate, ctrl.changePassword);
router.post('/logout', ctrl.logout);

module.exports = router;
