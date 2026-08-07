const { Router } = require('express');
const { publicLimiter } = require('../middlewares/rateLimit');

const health = require('./modules/health/health.routes');
const auth = require('./modules/auth/auth.routes');
const content = require('./modules/content/content.routes');
const academy = require('./modules/academy/academy.routes');
const admin = require('./modules/admin/admin.routes');

const router = Router();

router.use('/health', health);
router.use('/auth', auth);
router.use('/content', publicLimiter, content); // public, cached learning content
router.use('/academies', academy);
router.use('/admin', admin); // admin content editing (auth enforced inside)

// Phase 2+: router.use('/sessions', sessions)
// Phase 4:  router.use('/playground', playground)

module.exports = router;
