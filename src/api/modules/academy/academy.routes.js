const { Router } = require('express');
const validate = require('../../../middlewares/validate');
const { authenticate } = require('../../../middlewares/auth');
const authorize = require('../../../middlewares/authorize');
const { publicLimiter } = require('../../../middlewares/rateLimit');
const ctrl = require('./academy.controller');
const v = require('./academy.validation');

const router = Router();

// Public: an academy submits a registration/application form.
router.post('/apply', publicLimiter, validate(v.apply), ctrl.apply);

// Admin only: review applications.
router.get('/applications', authenticate, authorize('admin', 'superadmin'), ctrl.listApplications);
router.post(
  '/applications/:id/approve',
  authenticate,
  authorize('admin', 'superadmin'),
  validate(v.approve),
  ctrl.approve,
);
router.post(
  '/applications/:id/reject',
  authenticate,
  authorize('admin', 'superadmin'),
  ctrl.reject,
);

module.exports = router;
