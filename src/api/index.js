const { Router } = require('express');
const { publicLimiter } = require('../middlewares/rateLimit');

const health = require('./modules/health/health.routes');
const auth = require('./modules/auth/auth.routes');
const content = require('./modules/content/content.routes');
const academy = require('./modules/academy/academy.routes');
const admin = require('./modules/admin/admin.routes');
const sessions = require('./modules/sessions/sessions.routes');
const playground = require('./modules/playground/playground.routes');

const router = Router();

router.use('/health', health);
router.use('/auth', auth);
router.use('/content', publicLimiter, content); // public, cached learning content
router.use('/academies', academy);
router.use('/admin', admin); // admin content editing (auth enforced inside)
router.use('/sessions', sessions); // Phase 2: live teaching session lifecycle
router.use('/playground', playground); // Phase 4: reward grants for solo games

module.exports = router;
