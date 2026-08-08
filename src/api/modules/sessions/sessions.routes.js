const { Router } = require('express');
const validate = require('../../../middlewares/validate');
const { authenticate } = require('../../../middlewares/auth');
const authorize = require('../../../middlewares/authorize');
const ctrl = require('./sessions.controller');
const v = require('./sessions.validation');

const router = Router();

// Tutors (and admins) create/manage sessions.
router.post('/', authenticate, authorize('tutor', 'academy_admin', 'admin', 'superadmin'), validate(v.create), ctrl.create);
router.get('/mine', authenticate, ctrl.mine);

// Public: a student opens the shared link and resolves the session by code.
router.get('/:code', validate(v.byCode), ctrl.getByCode);

router.post('/:code/end', authenticate, validate(v.byCode), ctrl.end);

module.exports = router;
