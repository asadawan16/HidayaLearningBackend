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

const juzList = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listJuz() });
});

const juz = asyncHandler(async (req, res) => {
  const number = Number(req.params.number);
  if (!Number.isInteger(number) || number < 1 || number > 30) {
    throw ApiError.badRequest('Juz must be a number between 1 and 30');
  }
  const data = await service.getJuz(number);
  if (!data) throw ApiError.notFound('Juz not found');
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

const kalimas = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listKalimas() });
});

const kalima = asyncHandler(async (req, res) => {
  const data = await service.getKalima(req.params.slug);
  if (!data) throw ApiError.notFound('Kalima not found');
  res.json({ success: true, data });
});

const namaz = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listNamazSteps() });
});

module.exports = {
  surahs, surah, juzList, juz, qaidaLessons, qaidaLesson, duas, kalimas, kalima, namaz,
};
