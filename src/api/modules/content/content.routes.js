const { Router } = require('express');
const ctrl = require('./content.controller');

const router = Router();

// ---- Quran ----
router.get('/quran/surahs', ctrl.surahs);
router.get('/quran/surahs/:number', ctrl.surah);

// ---- Qaida ----
router.get('/qaida/lessons', ctrl.qaidaLessons);
router.get('/qaida/lessons/:slug', ctrl.qaidaLesson);

// ---- Duas ----
router.get('/duas', ctrl.duas);

module.exports = router;
