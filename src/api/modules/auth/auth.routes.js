const { Router } = require('express');
const validate = require('../../../middlewares/validate');
const { authenticate } = require('../../../middlewares/auth');
const { authLimiter } = require('../../../middlewares/rateLimit');
const ctrl = require('./auth.controller');
const v = require('./auth.validation');

const router = Router();

router.post('/login', authLimiter, validate(v.login), ctrl.login);
router.post('/refresh', authLimiter, validate(v.refresh), ctrl.refresh);
router.get('/me', authenticate, ctrl.me);
router.post('/change-password', authenticate, validate(v.changePassword), ctrl.changePassword);

module.exports = router;
