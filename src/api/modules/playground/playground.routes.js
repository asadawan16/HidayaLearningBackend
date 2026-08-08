const { Router } = require('express');
const validate = require('../../../middlewares/validate');
const { authenticate } = require('../../../middlewares/auth');
const authorize = require('../../../middlewares/authorize');
const ctrl = require('./playground.controller');
const v = require('./playground.validation');

const router = Router();

// Tutor grants a timed reward pass for the solo games.
router.post('/rewards', authenticate, authorize('tutor', 'academy_admin', 'admin', 'superadmin'), validate(v.grant), ctrl.grant);

// Public: a student resolves the reward token from the shared link.
router.get('/rewards/:token', validate(v.byToken), ctrl.resolve);

module.exports = router;
