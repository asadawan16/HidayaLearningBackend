const { Router } = require('express');
const validate = require('../../../middlewares/validate');
const { authenticate } = require('../../../middlewares/auth');
const authorize = require('../../../middlewares/authorize');
const ctrl = require('./admin.controller');
const v = require('./admin.validation');

const router = Router();

// All admin content editing requires an authenticated admin/superadmin.
router.use(authenticate, authorize('admin', 'superadmin'));

// Quran corrections (fix a wrong harakat/letter in an ayah or word)
router.patch('/quran/ayahs/:surah/:number', validate(v.ayah), ctrl.updateAyah);
router.patch('/quran/words/:surah/:ayah/:position', validate(v.word), ctrl.updateWord);

// Qaida lesson edits (metadata and/or full page/cell replacement)
router.patch('/qaida/lessons/:slug', validate(v.qaidaLesson), ctrl.updateQaidaLesson);

// Duas CRUD
router.post('/duas', validate(v.duaCreate), ctrl.createDua);
router.patch('/duas/:id', validate(v.duaUpdate), ctrl.updateDua);
router.delete('/duas/:id', validate(v.duaDelete), ctrl.deleteDua);

module.exports = router;
