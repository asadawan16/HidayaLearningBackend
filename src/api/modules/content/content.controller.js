const asyncHandler = require('../../../utils/asyncHandler');
const ApiError = require('../../../utils/ApiError');
const service = require('./content.service');

const surahs = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listSurahs() });
});

const surah = asyncHandler(async (req, res) => {
  const data = await service.getSurah(Number(req.params.number));
  if (!data) throw ApiError.notFound('Surah not found');
  res.json({ success: true, data });
});

const qaidaLessons = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listQaidaLessons() });
});

const qaidaLesson = asyncHandler(async (req, res) => {
  const data = await service.getQaidaLesson(req.params.slug);
  if (!data) throw ApiError.notFound('Lesson not found');
  res.json({ success: true, data });
});

const duas = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listDuas(req.query.category) });
});

module.exports = { surahs, surah, qaidaLessons, qaidaLesson, duas };
