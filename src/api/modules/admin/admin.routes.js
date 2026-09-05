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

// Qaida lessons: full CRUD. Editing was never enough on its own — an academy
// teaching its own syllabus has to be able to add a chapter, not only pages to
// the sixteen that came out of the scans.
router.post('/qaida/lessons', validate(v.qaidaLessonCreate), ctrl.createQaidaLesson);
router.patch('/qaida/lessons/:slug', validate(v.qaidaLesson), ctrl.updateQaidaLesson);
router.delete('/qaida/lessons/:slug', validate(v.qaidaLessonDelete), ctrl.deleteQaidaLesson);

// Duas CRUD
router.post('/duas', validate(v.duaCreate), ctrl.createDua);
router.patch('/duas/:id', validate(v.duaUpdate), ctrl.updateDua);
router.delete('/duas/:id', validate(v.duaDelete), ctrl.deleteDua);

// Kalimas CRUD (the six ship in the seed; admins can add more)
router.post('/kalimas', validate(v.kalimaCreate), ctrl.createKalima);
router.patch('/kalimas/:id', validate(v.kalimaUpdate), ctrl.updateKalima);
router.delete('/kalimas/:id', validate(v.kalimaDelete), ctrl.deleteKalima);

// Namaz steps CRUD
router.post('/namaz', validate(v.namazCreate), ctrl.createNamazStep);
router.patch('/namaz/:id', validate(v.namazUpdate), ctrl.updateNamazStep);
router.delete('/namaz/:id', validate(v.namazDelete), ctrl.deleteNamazStep);

module.exports = router;
